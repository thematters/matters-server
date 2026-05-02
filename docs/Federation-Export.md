# Federation Export Contract

This document records the non-production contract for turning selected public Matters articles into ActivityPub export bundles.

## Current scope

- Export is explicit and bounded by selected article IDs.
- Export reads through the read-only database connection or through a fixture file.
- Export writes local files only.
- Export does not deploy, push to IPFS, mutate production data, or publish ActivityPub by itself.

## Eligibility gate

The first production-facing contract is intentionally conservative:

| Gate | Rule |
|---|---|
| Author setting | Must be explicitly `enabled`. Missing or `disabled` means no federation. |
| Article setting | `inherit` follows the author setting. `enabled` is allowed only when the author is enabled. `disabled` blocks the article. |
| Public boundary | Article must still be active, public, and attached to an active author identity. |
| Non-public override | No setting can override paid, private, archived, missing-identity, or otherwise non-public content. |

The current pure function is `resolveFederationExportGate` in `src/connectors/article/federationExportService.ts`. It is a contract scaffold only; no database column or GraphQL mutation is created in this slice.

## Durable state scaffold

The schema scaffold uses two independent tables:

| Table | Purpose |
|---|---|
| `user_federation_setting` | One row per author. `state` is `enabled` or `disabled`; missing rows are treated as disabled by the service contract. |
| `article_federation_setting` | One row per article. `state` is `inherit`, `enabled`, or `disabled`; missing rows are treated as `inherit`. |

Both tables include `updated_by`, `created_at`, and `updated_at`. The migration is present for branch review, but this slice does not run it against production or wire it to GraphQL.

## Deferred production work

- Add product copy and UI controls.
- Wire export trigger behavior after publishing or editing an eligible article.
- Add audit logs for export decisions and skipped reasons.
- Complete legal/privacy approval before beta rollout.
