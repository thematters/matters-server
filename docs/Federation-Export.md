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

`FederationExportService` also exposes bounded upsert methods for author and article federation settings. These methods validate allowed states before writing and are wired to admin-only GraphQL mutations for internal/staging control plus pilot-scoped user mutations for G2-B.

## Internal admin entry points

The current GraphQL surface is intentionally narrow and admin-only:

| Mutation                                            | Purpose                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `putUserFederationSetting(input: { id, state })`    | Sets an author's federation opt-in state to `enabled` or `disabled`. |
| `putArticleFederationSetting(input: { id, state })` | Sets an article override to `inherit`, `enabled`, or `disabled`.     |

Both mutations require global GraphQL IDs and record the admin viewer ID in `updated_by`. They do not generate bundles, call IPFS/IPNS, publish ActivityPub, or change article visibility.

`evaluateFederationExportRows` returns a `decisionReport` with selected, eligible, skipped, and per-article skip reasons. Downstream async workers can persist or log that report without exposing credentials or private content.

## Trigger scaffold

`MATTERS_FEDERATION_EXPORT_TRIGGER_MODE` controls whether publish/edit flows record export decisions:

| Value         | Behavior                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `off`         | Default. Publishing and editing articles do not touch the federation export trigger scaffold.                   |
| `record_only` | After immediate publish or content revision, server records the strict eligibility decision for audit purposes. |

`record_only` writes to `federation_export_event` only. It does not call Lambda, write S3, generate bundles, deliver ActivityPub, push IPNS, or block normal publishing/editing if the audit write fails.

The recorded trigger names are:

| Trigger           | Source                                          |
| ----------------- | ----------------------------------------------- |
| `publish_article` | Immediate `publishArticle` mutation completion. |
| `revise_article`  | `editArticle` content revision path.            |

Scheduled publish, backfill, deletes, update activities, and external delivery remain outside this server scaffold until product and rollout approval.

## Pilot product entry points

G2-B adds two OAuth mutations gated by the `fediverseBeta` user feature flag:

| Mutation                                            | Purpose                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `setViewerFederationSetting(input: { state })`      | Lets a pilot viewer set only their own author-level federation setting. |
| `setArticleFederationSetting(input: { id, state })` | Lets a pilot author set only their own article federation override.     |

The feature flag is assigned through the existing admin feature-flag tooling. These mutations do not publish, backfill, delete, or export content; they only record settings for the server-side gate.

## Read-side product fields

G2-B adds read-side fields for Matters Web/App to display the current contract state without writing settings:

| Field                           | Purpose                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `User.federationSetting`        | Returns the author's explicit opt-in row, or `null` when default-off.    |
| `Article.federationSetting`     | Returns the article override row, or `null` when it inherits.            |
| `Article.federationEligibility` | Returns the computed server-side decision and effective article setting. |

`Article.federationEligibility` uses the same server gate as export runs. Matters Web may use it to show disabled states, but the UI must not treat its own state as authoritative.

## Durable state scaffold

The schema scaffold uses two independent tables:

| Table                        | Purpose                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `user_federation_setting`    | One row per author. `state` is `enabled` or `disabled`; missing rows are treated as disabled by the service contract. |
| `article_federation_setting` | One row per article. `state` is `inherit`, `enabled`, or `disabled`; missing rows are treated as `inherit`.           |
| `federation_export_event`    | One audit row per publish/edit trigger decision, including the strict `decisionReport` and skip reason.               |

The setting tables include `updated_by`, `created_at`, and `updated_at`. The event table records `article_id`, optional `actor_id`, trigger, mode, status, eligibility, skip reason, author/article settings, effective article setting, and the JSONB decision report.

The migration, service methods, internal admin GraphQL mutations, pilot product mutations, read fields, UI hooks, strict Lambda dry-run path, and `record_only` trigger scaffold are present for branch review and staging validation. This contract still does not run production export writes or external federation delivery.

## Deferred production work

- Decide whether production triggers should remain `record_only`, invoke a dry-run Lambda, or enqueue a write-capable worker.
- Add scheduled publish, backfill, delete/update, and retry semantics if product requires them.
- Select the production storage target, retention policy, and credentials owner.
- Complete legal/privacy approval before beta rollout.
