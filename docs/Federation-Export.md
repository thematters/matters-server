# Federation Export Contract

This document records the server-side contract for deciding whether selected Matters articles may be exported to external federation services.

## Current scope

- Server-side export eligibility is explicit and bounded by selected article IDs.
- `matters-server` owns federation settings, public-only gate decisions, and read-only candidate loading.
- `matters-server` does not build ActivityPub bundles, write files, deploy, push to IPFS/IPNS, or publish ActivityPub.
- Bundle generation and retryable file publication should live outside the main server runtime, for example in `lambda-handlers`.

## Eligibility gate

The first production-facing contract is intentionally conservative:

| Gate                | Rule                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Author setting      | Must be explicitly `enabled`. Missing or `disabled` means no federation.                                                   |
| Article setting     | `inherit` follows the author setting. `enabled` is allowed only when the author is enabled. `disabled` blocks the article. |
| Public boundary     | Article must still be active, public, and attached to an active author identity.                                           |
| Non-public override | No setting can override paid, private, archived, missing-identity, or otherwise non-public content.                        |

The current pure function is `resolveFederationExportGate` in `src/connectors/article/federationExportService.ts`.

The candidate loader can include federation setting joins when strict opt-in input is needed. Without that strict input, the service preserves the public-only preflight boundary.

`FederationExportService` also exposes bounded upsert methods for author and article federation settings. These methods validate allowed states before writing and are wired to admin-only GraphQL mutations for internal/staging control.

## Internal admin entry points

The current GraphQL surface is intentionally narrow and admin-only:

| Mutation                                            | Purpose                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `putUserFederationSetting(input: { id, state })`    | Sets an author's federation opt-in state to `enabled` or `disabled`. |
| `putArticleFederationSetting(input: { id, state })` | Sets an article override to `inherit`, `enabled`, or `disabled`.     |

Both mutations require global GraphQL IDs and record the admin viewer ID in `updated_by`. They do not generate bundles, call IPFS/IPNS, publish ActivityPub, or change article visibility.

`evaluateFederationExportRows` returns a `decisionReport` with selected, eligible, skipped, and per-article skip reasons. Downstream async workers can persist or log that report without exposing credentials or private content.

## Read-side product fields

G2-B adds read-side fields for Matters Web/App to display the current contract state without writing settings:

| Field                           | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `User.federationSetting`        | Returns the author's explicit opt-in row, or `null` when default-off.   |
| `Article.federationSetting`     | Returns the article override row, or `null` when it inherits.           |
| `Article.federationEligibility` | Returns the computed server-side decision and effective article setting. |

`Article.federationEligibility` uses the same server gate as export runs. Matters Web may use it to show disabled states, but the UI must not treat its own state as authoritative.

## Durable state scaffold

The schema scaffold uses two independent tables:

| Table                        | Purpose                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `user_federation_setting`    | One row per author. `state` is `enabled` or `disabled`; missing rows are treated as disabled by the service contract. |
| `article_federation_setting` | One row per article. `state` is `inherit`, `enabled`, or `disabled`; missing rows are treated as `inherit`.           |

Both tables include `updated_by`, `created_at`, and `updated_at`. The migration, service methods, and internal admin GraphQL mutations are present for branch review and staging validation, but this slice does not run it against production or expose user-facing UI.

## Deferred production work

- Add product copy and UI controls.
- Move bundle generation and file publication to `lambda-handlers`.
- Wire async export trigger behavior after publishing or editing an eligible article.
- Add audit logs for export decisions and skipped reasons.
- Complete legal/privacy approval before beta rollout.
