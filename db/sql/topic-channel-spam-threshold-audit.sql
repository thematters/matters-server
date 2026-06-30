-- Topic channel spam threshold review list.
--
-- Buckets:
-- - pseudo_positive_candidate: hidden from topic channels by the 0.8 channel
--   threshold, but still below the global spam threshold.
-- - pseudo_negative_candidate: still allowed into topic channels, but close
--   enough to 0.8 to sample for missed spam.
--
-- This query does not model account freezes, restrictions, reports, bans, or
-- deletions. Those should continue to use their own OSS moderation criteria.

with thresholds as (
  select
    0.8::float as topic_channel_threshold,
    (
      select value
      from feature_flag
      where name = 'spam_detection'
        and flag = 'on'
      limit 1
    ) as global_spam_threshold
),
latest_article_version as (
  select distinct on (article_id)
    article_id,
    title,
    summary,
    created_at
  from article_version
  order by article_id, created_at desc
),
topic_channel_candidates as (
  select
    tc.id as channel_id,
    tc.name as channel_name,
    tc.short_hash as channel_short_hash,
    tca.article_id,
    tca.score as channel_score,
    tca.is_labeled as channel_is_labeled,
    tca.created_at as channel_article_created_at,
    a.short_hash as article_short_hash,
    a.author_id,
    a.spam_score,
    a.is_spam,
    a.state,
    a.channel_enabled,
    lav.title,
    lav.summary,
    thresholds.topic_channel_threshold,
    thresholds.global_spam_threshold
  from topic_channel_article tca
  join topic_channel tc on tc.id = tca.channel_id
  join article a on a.id = tca.article_id
  left join latest_article_version lav on lav.article_id = a.id
  cross join thresholds
  where tca.enabled = true
    and tc.enabled = true
    and a.state = 'active'
    and a.channel_enabled = true
    and a.is_spam is null
    and a.spam_score is not null
)
select
  case
    when spam_score >= topic_channel_threshold
      and (
        global_spam_threshold is null
        or spam_score < global_spam_threshold
      )
      then 'pseudo_positive_candidate'
    when spam_score >= 0.65
      and spam_score < topic_channel_threshold
      then 'pseudo_negative_candidate'
  end as review_bucket,
  channel_name,
  channel_short_hash,
  article_id,
  article_short_hash,
  author_id,
  spam_score,
  channel_score,
  channel_is_labeled,
  topic_channel_threshold,
  global_spam_threshold,
  title,
  summary,
  channel_article_created_at
from topic_channel_candidates
where (
    spam_score >= topic_channel_threshold
    and (
      global_spam_threshold is null
      or spam_score < global_spam_threshold
    )
  )
  or (
    spam_score >= 0.65
    and spam_score < topic_channel_threshold
  )
order by review_bucket, spam_score desc, channel_article_created_at desc;
