# SPEC: Topic Channel Spam Threshold And Detector Audit

| Field                 | Value                                           |
| --------------------- | ----------------------------------------------- |
| Feature / change name | Topic channel spam threshold and detector audit |
| Owner                 | Mashbean                                        |
| Drafted by            | Codex                                           |
| Risk tier             | Full                                            |
| Date                  | 2026-06-30                                      |
| Status                | Approved                                        |

## 1. Problem & User

Moderators and readers are seeing a recent surge of spam in `https://matters.town/newest` and topic channels such as `生活事` and `性別／愛`. The current production `spam_detection` threshold is `0.94`, so articles with `spam_score < 0.94` can remain visible or be collected into topic channels even when the content is clearly spam.

The user-visible goal is to reduce spam collected by topic channels with a more aggressive channel-only threshold while keeping account-state and global visibility decisions conservative.

## 2. Goal & Non-Goals

In scope:

- Add a topic-channel-only spam filter threshold fixed at `0.8`.
- Apply the topic-channel spam threshold to all topic channels.
- Keep the existing global `spam_detection` threshold separate from topic channel collection.
- Preserve `spam_detection` behavior for publication, `/newest`, search exclusion, global visibility, comments, account restrictions, freezes, bans, and deletions.
- Capture detector response metadata for future audit and calibration, including `score`, `decision`, `reason`, `p_spam`, and `p_ham` when the detector returns them.
- Add durable audit logging for manual spam status changes and article state changes.
- Provide a review list for pseudo positive and pseudo negative sampling.
- Add tests proving channel-only filtering can be more aggressive than global spam filtering.

Out of scope:

- No account freezing, banning, restriction, or deletion rule changes.
- No production mutation as part of implementation.
- No retraining or redeploying the Lambda spam model.
- No public dataset release change.
- No UI change.

## 3. Success Criteria

| #   | Acceptance condition                                                                                                                       | How verified                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Topic channel articles use a channel-only spam threshold and can exclude `spam_score >= 0.8` while global spam threshold remains `0.94`.   | Unit test for `ChannelService.findTopicChannelArticles`; staging GraphQL query against a controlled article set. |
| 2   | `/newest` continues to use the global `spam_detection` threshold.                                                                          | Unit test for `ArticleService.findNewestArticles` or resolver-level regression test.                             |
| 3   | Publication spam decision does not use the channel-only threshold.                                                                         | Unit test around `PublicationService._runPostProcessing` or existing publication spam tests.                     |
| 4   | Detector metadata is preserved when returned by the model and old score-only responses still work.                                         | Unit tests for `SpamDetector.detect` and post-processing persistence/logging.                                    |
| 5   | Manual `setSpamStatus` and `updateArticleState` produce audit records with actor, target, old value, new value, and reason when available. | Resolver unit tests and audit log query inspection in staging.                                                   |
| 6   | All topic channels use `0.8` after migration, while non-channel moderation decisions keep their existing criteria.                         | Migration review and topic channel query tests.                                                                  |
| 7   | Operators can generate a review list for pseudo positive and pseudo negative sampling.                                                     | `db/sql/topic-channel-spam-threshold-audit.sql`.                                                                 |

## 4. Repos & Service Placement

| Work area                        | Repo                                                             | Core / Non-core   | Reason                                                                       |
| -------------------------------- | ---------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| Topic channel spam filtering     | `thematters/matters-server`                                      | Core              | Topic channel GraphQL query and domain filtering live in `ChannelService`.   |
| Detector response handling       | `thematters/matters-server`                                      | Core              | Publication post-processing currently owns article `spam_score` persistence. |
| Manual moderation audit log      | `thematters/matters-server`                                      | Core              | `setSpamStatus` and `updateArticleState` are core admin mutations.           |
| Historical dataset investigation | `thematters/matters-spam-dataset`, AWS S3 when session is active | Non-core evidence | Dataset is evidence and calibration input, not runtime behavior.             |

## 5. Data & Schema

New or changed tables and columns:

- Preferred additive migration on `article`:
  - `decision text nullable`
  - `reason text nullable`
  - `p_spam float nullable`
  - `p_ham float nullable`
- Add feature flag row:
  - `topic_channel_spam_filter`, `flag=on`, `value=0.8`

Review list:

- `db/sql/topic-channel-spam-threshold-audit.sql`
- `pseudo_positive_candidate` lists articles that are blocked by topic-channel `0.8` but remain below global `spam_detection`.
- `pseudo_negative_candidate` lists articles still allowed by topic-channel `0.8`, but close enough to sample for missed spam.
- The list is for channel collection review only and must not be used as account enforcement input.

GraphQL:

- No public GraphQL fields by default.
- OSS-only spam status can later expose detector metadata if needed, but this SPEC does not require it.

Backfill:

- No mandatory backfill. Existing rows keep only `spam_score`.
- Historical CloudWatch and dataset score evidence can be used for calibration, but implementation must tolerate null metadata.

Dataset finding so far:

- `matters-spam-dataset` public schema does not include detector raw response.
- Internal v2026.06 files include `current_spam_score`, `current_is_spam`, `label_source`, and correction metadata.
- The documented source families are separate and must not be mixed as ground truth: public release, correction CSV, and legacy S3 parquet.
- AWS verification found `matters-spam-sample-worker`, writing comment samples to `s3://matters-spam-training-samples/comment-training-samples/l2-captured`. Those records contain `label`, `text`, `labelSource`, `commentHash`, `occurredAt`, and optional `score` or `authorHash`, but not article detector raw response.
- S3 also contains article correction and ring-shadow artifacts, but no article detector raw response store was found.
- `spam-detection-serverless` article handler reads `event.body` as raw text and its README examples use raw POST bodies. Direct production endpoint comparison showed JSON `{ "text": ... }` can score normal text near spam levels, while raw body returns the expected lower score. `matters-server` article detection must use raw body before trusting score or `decision` comparisons.

## 6. Permissions

| Actor                      | May do                                                                        | Must NOT do                                                            | Enforced by                                                               |
| -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Anonymous / regular viewer | Read topic channel articles filtered by enabled thresholds.                   | See admin-only detector metadata or audit log internals.               | Existing public GraphQL resolvers.                                        |
| Admin / OSS user           | Read spam status and moderate content according to existing permission gates. | Change production feature flags without explicit approval.             | Existing `@auth(mode: admin)`, `readSpamStatus`, and `setFeature` policy. |
| Server post-processing     | Persist detector score and metadata.                                          | Freeze, ban, delete, or restrict accounts from channel-only threshold. | Service-layer separation and tests.                                       |

## 7. Risk Class

| Risk surface                  | Touched? | Boundary                                                                             |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Payments / payout / wallet    | No       | Not touched.                                                                         |
| Moderation / spam / blocklist | Yes      | Topic channel spam filtering, detector metadata, manual moderation audit logging.    |
| Federation / ActivityPub      | No       | No federation export changes.                                                        |
| Auth / OAuth / session        | No       | No auth changes.                                                                     |
| File upload                   | No       | Not touched.                                                                         |
| Public domain routing         | No       | Not touched.                                                                         |
| Account state / permissions   | Yes      | Audit logging reads actor and target state, but does not change account-state rules. |
| Email / notifications         | No       | No notification behavior change.                                                     |

Security review is mandatory before production promotion or flag launch.

## 8. Feature-Flag Plan

| Field                   | Value                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| State while in progress | On for all topic channels                                                                            |
| Flag name               | `topic_channel_spam_filter`                                                                          |
| Default state           | `on`, `value=0.8`                                                                                    |
| Back-end guard          | `SystemService.getTopicChannelSpamThreshold`, used only by `ChannelService.findTopicChannelArticles` |
| Front-end gating        | None. No UI.                                                                                         |
| Launch trigger          | Deploy after owner approval and monitor review-list samples.                                         |
| Kill-switch             | `setFeature(name: topic_channel_spam_filter, flag: off)`                                             |

## 9. Design Surface

| Field                     | Value          |
| ------------------------- | -------------- |
| Any UI?                   | No             |
| Design handoff spec       | Not applicable |
| Design-system conformance | Not applicable |

## 10. Rollout & Rollback

Rollout:

- Merge additive schema and default-on topic channel feature flag to `develop`.
- Deploy to staging with `topic_channel_spam_filter=on`, `value=0.8`.
- Verify topic channel spam reduction without changing `/newest`, publication spam handling, account restrictions, freezes, bans, or deletion.
- Generate pseudo positive and pseudo negative samples with `db/sql/topic-channel-spam-threshold-audit.sql`.
- After security review and owner approval, promote to production with the same topic-channel-only threshold.

Rollback:

- Set `topic_channel_spam_filter` to `off`.
- Existing global `spam_detection` threshold remains independent.
- Detector metadata columns are additive and can remain unused.

Monitoring:

- Topic channel article volume by channel.
- Articles excluded by channel spam threshold.
- False-positive samples, especially `生活事`, `性別／愛`, `書音影`, and `身心靈`.
- `/newest` spam visibility separately from channel collection.
- OSS moderation actions, reports, freezes, restrictions, bans, and deletions separately from topic channel collection.

## 11. Open Questions

- No article detector raw response store was found in the checked S3 bucket or local dataset repos. If one exists, it is outside `matters-spam-training-samples` or under a name not discovered in this pass.
- Detector metadata is stored as individual nullable columns: `decision`, `reason`, `p_spam`, and `p_ham`.
- The article detector request contract is raw body. `matters-server` should send raw text for article detection while leaving comment and moment detector calls unchanged.
- Confirm whether `decision=block` should be used for global visibility in a later SPEC after replay validation. It is not part of this channel-only change.
- Confirm whether audit log should include a free-form moderation reason now or only old/new state.
