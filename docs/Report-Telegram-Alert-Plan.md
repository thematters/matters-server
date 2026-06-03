# Report Telegram Alert Change Plan

## Goal

Send near-real-time Telegram alerts when admin-actionable reports are created,
without putting Telegram delivery, bot tokens, or Telegram API failures in the
GraphQL request path.

The server should remain the source of truth for report event creation because
the report mutations already have the exact business context. Telegram delivery
should run out of band in an SQS-triggered Lambda worker.

## Current PR Shape

PR #4830 currently wires a `TelegramService` into the GraphQL data sources and
calls it from:

- `src/mutations/system/submitReport.ts`
- `src/mutations/comment/communityWatchRemoveComment.ts`

The implementation is fire-and-forget and no-ops without runtime config, but it
still adds Telegram-specific runtime configuration, Redis dedupe, API calls, and
Sentry reporting to the main server runtime.

## Proposed Architecture

```text
GraphQL mutation
  -> persist the report / community-watch action
  -> enqueue ReportAlertRequested message to SQS
  -> return mutation response

SQS
  -> reportTelegramAlert Lambda
  -> Redis/DynamoDB dedupe
  -> Telegram sendMessage/editMessageText
```

## Server-Side Scope

Keep only the report alert event producer in `matters-server` request handling:

- Add a small event payload type, for example `ReportAlertRequested`.
- Add one SQS queue URL env var, for example
  `MATTERS_AWS_REPORT_ALERT_QUEUE_URL`.
- Enqueue after the existing mutation work succeeds.
- Do not import Telegram SDK/API code from GraphQL routes.
- Do not keep Telegram bot token or chat id in the API Lambda/Express runtime.
- Keep the enqueue call best-effort: log/report enqueue failure, but do not fail
  the user-facing mutation.

Suggested payload:

```ts
type ReportAlertRequested = {
  source: 'direct' | 'community_watch'
  dedupeKey: string
  subject: string
  reason: string
  ossUrl?: string
  occurredAt: string
}
```

Suggested producer locations:

- `src/mutations/system/submitReport.ts`
  - `dedupeKey`: `direct:${type}:${targetId}`
  - `subject`: `${type} (${targetGlobalId})`
  - `ossUrl`: `${ossSiteDomain}/reports?targetId=${targetGlobalId}`
- `src/mutations/comment/communityWatchRemoveComment.ts`
  - `dedupeKey`: `cw:author:${authorId}`
  - `subject`: display name / username fallback from `atomService.userIdLoader`
  - `ossUrl`: `${ossSiteDomain}/reports`

## Worker-Side Scope

Add a dedicated SQS-triggered Lambda handler, for example:

- `src/handlers/reportTelegramAlert.ts`

Responsibilities:

- Parse and validate `ReportAlertRequested`.
- Deduplicate by `dedupeKey` for 24 hours.
- Send a new Telegram message for the first event.
- Edit the existing Telegram message and increment the count for repeated
  events in the dedupe window.
- Log and return per-record batch failures using the same SQS partial failure
  shape as existing handlers such as `src/handlers/notify.ts`.

Runtime config should live only in the worker deployment:

- `MATTERS_TELEGRAM_BOT_TOKEN`
- `MATTERS_TELEGRAM_ALERT_CHAT_ID`
- `MATTERS_TELEGRAM_ALERT_THREAD_ID` optional
- `MATTERS_OSS_SITE_DOMAIN`

## Deployment Changes

Reuse the existing queue Lambda deployment pattern:

- `deployment/lambda/queuejob.yml`
- `.github/workflows/lambda-deploy.yml`

Add a new deployment entry for the report alert worker:

- `lambdaCMD=reportTelegramAlert.handler`
- queue name: `report-alert-${SQS_ENV}` or similar
- low batch size, for example `sqsBatchSize=2`
- short batching window, for example `sqsMaxBatchingWindowInSeconds=2`
- timeout around 10 seconds
- memory around 256 MB

The API/server runtime needs permission to send to the queue. The worker needs
permission to receive/delete from the queue and read its SSM config.

## Why Not Fully External Polling

A scheduled Lambda that polls the database would avoid any server code changes,
but it has worse operational properties:

- It is delayed by the polling interval.
- It has to infer business events from persisted data instead of receiving the
  exact mutation context.
- It needs production database or read-replica access.
- It must maintain its own cursor and duplicate/lost-event handling.
- It may not fully reconstruct `communityWatchRemoveComment` semantics if the
  action is not represented as a clean report event row.

Using the server only as the event producer keeps the server change small while
avoiding a fragile external reconstruction path.

## Migration Plan

1. Replace the in-process `TelegramService` usage with an SQS event producer.
2. Move Telegram formatting, dedupe, send, and edit logic into
   `src/handlers/reportTelegramAlert.ts`.
3. Add queue URL config to the server runtime and Telegram config only to the
   worker runtime.
4. Add the Lambda deploy entry and create the SQS queue for dev/prod.
5. Smoke test on develop:
   - trigger `submitReport`
   - verify one Telegram message
   - trigger the same report subject again
   - verify the original message is edited and count increments
   - trigger `communityWatchRemoveComment`
   - verify the community-watch source label appears
6. Deploy production with the queue enabled, then provision bot/chat SSM params
   for the worker.

## Validation Checklist

- `npm run lint`
- `npm run build`
- Targeted tests for:
  - event payload generation from `submitReport`
  - event payload generation from `communityWatchRemoveComment`
  - handler first-message send
  - handler duplicate-message edit
  - handler per-record failure response
- Manual dev smoke test with real Telegram bot config.

## Acceptance Criteria

This work is accepted only when all of the following are true:

- The GraphQL API no longer imports or instantiates Telegram delivery code.
- `MATTERS_TELEGRAM_BOT_TOKEN`, `MATTERS_TELEGRAM_ALERT_CHAT_ID`, and
  `MATTERS_TELEGRAM_ALERT_THREAD_ID` are needed only by the worker runtime, not
  by the API runtime.
- `submitReport` still persists and returns the report when the report-alert
  queue is unavailable.
- `communityWatchRemoveComment` still completes the comment removal flow when
  the report-alert queue is unavailable.
- Both producer locations enqueue a payload with stable `source`, `dedupeKey`,
  `subject`, `reason`, `ossUrl`, and `occurredAt` fields.
- The worker sends one Telegram message for the first event with a given
  `dedupeKey`.
- The worker edits the existing Telegram message and increments the count for
  subsequent events with the same `dedupeKey` inside the 24-hour dedupe window.
- The worker posts a new message when the cached Telegram message can no longer
  be edited.
- The worker returns SQS partial batch failures so one bad record does not hide
  unrelated failed records or force successful records to be retried.
- Unit tests cover both producer payloads, first-message send, duplicate-message
  edit, malformed payload handling, and per-record failure reporting.
- CI/build validation passes before the PR is marked ready for review.
- A develop-environment smoke test verifies one direct report alert and one
  community-watch alert using real Telegram bot config.

## Agent Handoff Instructions

You are taking over PR #4830:

- Base PR: <https://github.com/thematters/matters-server/pull/4830>
- Head branch: `yingshinlee:feat/report-telegram-alert`
- Local working copy used for this plan:
  `/Users/mashbean/Documents/AI-Agent/external/release/matters-server`
- Current plan document:
  `docs/Report-Telegram-Alert-Plan.md`

Your task is to convert the current PR from "API runtime sends Telegram
directly" to "API runtime emits an SQS event, Lambda worker sends Telegram".

Do this in this order:

1. Inspect the current PR diff and keep the two business trigger points:
   `src/mutations/system/submitReport.ts` and
   `src/mutations/comment/communityWatchRemoveComment.ts`.
2. Remove Telegram delivery from the GraphQL request path:
   - remove `TelegramService` from GraphQL data sources
   - remove Telegram bot/chat env vars from API runtime usage
   - remove direct Telegram API calls from mutation code
3. Add a small report-alert event producer:
   - prefer existing AWS/SQS helpers in `src/connectors/aws/index.ts`
   - add a queue URL env var for the report-alert queue
   - keep enqueue best-effort and non-blocking for user-facing mutations
4. Add a dedicated SQS Lambda handler:
   - suggested file: `src/handlers/reportTelegramAlert.ts`
   - use the same SQS partial batch failure style as `src/handlers/notify.ts`
   - move Telegram formatting, HTML escaping, dedupe, send, and edit logic into
     this handler or a worker-only helper module
5. Wire deployment:
   - reuse `deployment/lambda/queuejob.yml`
   - add a `reportTelegramAlert.handler` deploy entry in
     `.github/workflows/lambda-deploy.yml`
   - keep Telegram secrets in worker SSM/runtime config only
6. Add tests before asking for review:
   - producer payload generation for direct reports
   - producer payload generation for community-watch removals
   - worker sends first Telegram message
   - worker edits duplicate Telegram message
   - worker handles malformed records and returns partial batch failures
7. Run validation:
   - `npm run lint`
   - `npm run build`
   - targeted tests added above
8. Update the PR description/comment with:
   - architecture change summary
   - validation output
   - deployment config needed
   - any manual smoke test result or blocker

Important constraints:

- Do not change report/community-watch product behavior beyond alert delivery.
- Do not add an inbound Telegram webhook, bot commands, or moderation actions
  inside Telegram.
- Do not put report body/comment text into Telegram messages unless product
  explicitly approves it.
- Do not make Telegram or SQS failure fail a user-facing report/removal
  mutation.
- Do not merge or deploy this PR just because CI passes; keep review, CI,
  deploy, production config, and smoke test as separate gates.
- Do not stage unrelated generated files. Check `.gitignore` and `git status`
  before commit.

Suggested commit messages:

- `refactor(report): emit report alert events`
- `feat(report): handle telegram alerts in queue worker`
- `test(report): cover report alert worker flow`

## Rollback

If Telegram delivery misbehaves, disable the worker by removing bot/chat config
or pausing the SQS event source mapping. Report mutations should continue to
work because Telegram delivery is out of band.
