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

## Rollback

If Telegram delivery misbehaves, disable the worker by removing bot/chat config
or pausing the SQS event source mapping. Report mutations should continue to
work because Telegram delivery is out of band.
