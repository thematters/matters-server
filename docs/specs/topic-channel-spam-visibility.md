# SPEC: Topic Channel Spam Visibility Controls

| Field | Value |
| --- | --- |
| Feature / change name | Topic channel spam visibility controls |
| Owner | Matters moderation / OSS owner |
| Drafted by | agent |
| Risk tier | Full |
| Date | 2026-07-13 |
| Status | Approved by thread context |

## 1. Problem & User

Moderators and operators need to explain why spam-like articles remain visible in topic channels such as `性別／愛` and `生活事`. Current production evidence shows the channel threshold is active, but many suspicious articles have spam scores below the topic-channel threshold and therefore remain visible. OSS can see only the score and manual spam label, not the detector's raw decision metadata.

## 2. Goal & Non-Goals

- In scope:
  - Expose stored spam detector metadata to admin-only `Article.oss.spamStatus`.
  - Preserve existing public and read-spam-status permissions.
  - Document the production-only hotfix path for lowering `topic_channel_spam_filter`.
  - Prepare the data surface needed for pseudo positive and pseudo negative review.
- Out of scope:
  - Changing the global `spam_detection` threshold.
  - Freezing, restricting, or terminating users from this signal.
  - Replacing the spam model in this PR.
  - Adding a new OSS page in this PR.

## 3. Success Criteria

| # | Acceptance condition | How verified |
| --- | --- | --- |
| 1 | Admin can query `decision`, `reason`, `pSpam`, and `pHam` under `Article.oss.spamStatus`. | GraphQL type test |
| 2 | Visitors and ordinary users without `readSpamStatus` still cannot read `Article.oss.spamStatus`. | Existing auth tests |
| 3 | Topic channel visibility behavior is unchanged by this PR. | No change to channel filtering logic |
| 4 | Production threshold changes remain explicit human-approved operations. | Release notes and runbook |

## 4. Repos & Service Placement

| Work area | Repo | Core / Non-core | Reason |
| --- | --- | --- | --- |
| GraphQL admin data surface | `thematters/matters-server` | Core | Article OSS fields and auth live here |
| Future OSS list UI | `thematters/matters-oss-next` | Core admin UI | Not part of this PR |
| Future model/dataset feedback | spam dataset / detector repos | Non-core | Model retraining and labels should stay outside `matters-server` |

## 5. Data & Schema

- New tables or columns: none in this PR. `article.decision`, `article.reason`, `article.p_spam`, and `article.p_ham` already exist.
- New GraphQL fields: `SpamStatus.decision`, `SpamStatus.reason`, `SpamStatus.pSpam`, `SpamStatus.pHam`.
- Migration or backfill: none.

## 6. Permissions

| Actor | May do | Must NOT do | Enforced by |
| --- | --- | --- | --- |
| Admin | Read raw detector metadata through `Article.oss.spamStatus` | Mutate detector metadata through this query | Existing `ArticleOSS.spamStatus` resolver auth plus field `@auth(admin)` |
| User with `readSpamStatus` | Read existing score and manual spam state | Read raw detector metadata | Field-level `@auth(admin)` on detector metadata |
| Visitor / ordinary user | No access to `Article.oss.spamStatus` | Read score or detector metadata | Existing resolver `ForbiddenError` |

## 7. Risk Class

| Risk surface | Touched? | Boundary |
| --- | --- | --- |
| Payments / payout / wallet | no | None |
| Moderation / spam / blocklist | yes | Read-only admin metadata exposure |
| Federation / ActivityPub | no | None |
| Auth / OAuth / session | no | Existing auth guard preserved |
| File upload | no | None |
| Public domain routing | no | None |
| Account state / permissions | no | No state mutation |
| Email / notifications | no | None |

Security review is required before production because this touches moderation data.

## 8. Feature-Flag Plan

| Field | Value |
| --- | --- |
| State while in progress | Done |
| Flag name | None for metadata fields |
| Default state | Existing admin-only GraphQL auth |
| Back-end guard | Existing `Article.oss.spamStatus` auth plus field `@auth(admin)` |
| Front-end gating | Not mounted in this PR |
| Launch trigger | Merge to `develop`, verify on staging, promote with release |
| Kill-switch | Revert PR or stop selecting fields in OSS |

Production hotfix, if separately approved by the owner: call `setFeature(input: { name: topic_channel_spam_filter, flag: on, value: 0.65 })`. Rollback is `setFeature(input: { name: topic_channel_spam_filter, flag: on, value: 0.8 })`.

## 9. Design Surface

| Field | Value |
| --- | --- |
| Any UI? | no |
| Design handoff spec | not applicable |
| Design-system conformance | not applicable |

## 10. Rollout & Rollback

- Rollout: merge to `develop`, verify admin GraphQL on staging, then include in the next `develop` to `master` promotion.
- Rollback: revert PR or avoid selecting the new fields from clients.
- Monitoring: check GraphQL auth errors, OSS article spam-status queries, and topic-channel pseudo negative samples.

## 11. Open Questions

- Whether to lower production `topic_channel_spam_filter` from `0.8` to `0.65` now requires explicit production mutation approval.
- The OSS pseudo negative list needs a separate UI/API spec.
