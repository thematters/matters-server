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

## Deferred production work

- Add durable author-level federation preference.
- Add durable per-article federation preference.
- Add product copy and UI controls.
- Wire export trigger behavior after publishing or editing an eligible article.
- Add audit logs for export decisions and skipped reasons.
- Complete legal/privacy approval before beta rollout.
