# Discovery Spam Filter

## Context

Production topic channels and `/newest` can show detector-blocked articles while
the global `spam_detection` threshold stays at `0.94`. This global threshold is
also used by moderation and account-safety flows, so lowering it directly would
change freeze, report, restriction, and account-deletion behavior.

## Decision

Add `discovery_spam_filter` as a discovery-only threshold. The default rollout
value is `0.6`.

Discovery surfaces include:

- `/newest`
- topic channel article lists, through the existing `topic_channel_spam_filter`
- recommendation services that build public discovery modules from newest or
  hottest article pools
- tag article and moment feeds
- related article recommendations

Moderation and account-safety surfaces continue to use `spam_detection`.

## Detector Metadata Gate

For public discovery filtering, non-bypassed and unlabeled articles must pass all
of these gates:

- `spam_score` is below the active discovery threshold, or `spam_score` is null
- `decision` is not `block`, or `decision` is null
- `p_ham` is greater than `0.02`, or `p_ham` is null

Existing overrides stay intact:

- `bypassSpamDetection` authors are allowed through discovery filters
- manual `is_spam = false` labels are allowed through discovery filters
- manual `is_spam = true` labels are excluded

## Backfill Query

Use this query to list currently public articles that detector metadata would now
hide from discovery surfaces, excluding bypassed authors:

```sql
select
  a.id,
  a.short_hash,
  avn.title,
  a.author_id,
  u.user_name,
  a.spam_score,
  a.decision,
  a.p_spam,
  a.p_ham,
  a.created_at
from article a
join article_version_newest avn on avn.article_id = a.id
join "user" u on u.id = a.author_id
where a.state = 'active'
  and a.is_spam is null
  and not exists (
    select 1
    from user_feature_flag uff
    where uff.user_id = a.author_id
      and uff.type = 'bypassSpamDetection'
  )
  and (
    a.decision = 'block'
    or a.p_ham <= 0.02
    or a.spam_score >= 0.6
  )
order by a.created_at desc;
```
