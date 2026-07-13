# Spam Ring OSS Defaults and Merge Refinement

## Problem

Operators use the OSS `集團偵測` page as the default review queue. The queue
currently surfaces high-score older rings first, keeps rings whose members were
already handled by other moderation actions, and can split one campaign into
many small five-member rings when templates differ but the same strong entity is
shared.

## Users

- OSS operators handling spam-ring review and freeze actions.
- Trust and safety maintainers monitoring daily digest counts.

## Scope

- `matters-server`: add an actionable filter for `oss.spamRings` and make the
  unspecified sort default newest first.
- `matters-oss-next`: make the rings page default to newest pending actionable
  rings, with a fallback when the server schema has not deployed yet.
- `spam-detection-scaffold`: merge ring candidates that share conservative
  strong entities across templates.

## Out of Scope

- No production moderation mutations.
- No automatic freeze rollout change.
- No backfill or mutation of existing `spam_ring` rows.
- No broad redesign of the OSS console.

## Acceptance

- Opening `/next/rings` defaults to pending rings sorted by `detectedAt` desc.
- The default pending queue excludes rings with no members still eligible for
  handling.
- Operators can still disable the local hide-handled toggle to inspect raw
  pending data.
- Candidate merge still groups by normalized fingerprint, and additionally
  groups by invite code, contact id, or external domain.
- Brand-only matches do not merge across templates.

## Risk

Moderation/admin surface. Security review is required before production
promotion. The server and OSS changes are read-only query/UI behavior. The
scaffold change affects future candidate writeback shape, but does not freeze
accounts by itself.

## Rollback

- Revert the three PRs.
- If only the server PR rolls back, OSS falls back to local hide-handled filtering
  because it probes the GraphQL input schema before sending `actionable`.
