
SHOW work_mem ;
SET work_mem TO '1 GB';
SHOW work_mem ;

CREATE OR REPLACE FUNCTION pg_temp.global_id(type text, id int) RETURNS text AS
$$
SELECT rtrim(encode((type || ':' || id) ::bytea, 'base64'), '=')
$$
LANGUAGE SQL IMMUTABLE
RETURNS NULL ON NULL INPUT;


CREATE OR REPLACE FUNCTION pg_temp.avatar_url(input text) RETURNS text AS
$$
SELECT CASE
  -- WHEN starts_with(input, 'imgCached/') THEN 'https://assets.matters.news/' || input
  WHEN input LIKE 'imgCached/%' THEN input
                                ELSE 'processed/144w/' || input
  END
$$
LANGUAGE SQL IMMUTABLE
RETURNS NULL ON NULL INPUT;


\set old _old
DROP TABLE IF EXISTS :schema.:tablename:old ;
ALTER TABLE IF EXISTS :schema.:tablename RENAME TO :tablename:old ;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE) CREATE TABLE :schema.:tablename AS
  WITH author_articles AS (
    SELECT author_id,
      count(*) ::int AS num_articles,
      -- (array_agg(concat(id, '-', slug, '-', media_hash) ORDER BY updated_at DESC))[1:5] AS last_5,
      sum(word_count) ::int AS sum_word_count,
      max(updated_at) AS last_at
     FROM article
     WHERE state IN ('active')
    GROUP BY 1
  ), article_stats_per_month AS (
    SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'month', month, 'num_articles', num_articles, -- 'num_authors', num_authors
          'sum_word_count', sum_word_count, 'month_last', month_last, 'last_5', last_5
        ) ORDER BY month DESC))[1:18]
      ) AS stats
    FROM (
      SELECT author_id, date_trunc('month', created_at) ::date AS month,
        MAX(created_at) AS month_last,
        COUNT(id) ::int AS num_articles, -- COUNT(DISTINCT author_id) ::int AS num_authors
        sum(word_count) ::int AS sum_word_count,
        (ARRAY_AGG(concat(id)))[1:5] AS last_5
      FROM article
      -- WHERE created_at >= date_trunc('month', CURRENT_DATE - '18 months'::interval)
      WHERE state IN ('active') -- NOT IN ('archived')
      GROUP BY 1, 2
    ) st
    GROUP BY 1
  ), article_stats_per_tag AS ( -- SELECT 1 AS author_id
    SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
            'id_tag', CASE WHEN tag_id IS NULL THEN NULL ELSE concat(tag.id, '-', trim(both '-' from regexp_replace(tag.content, '\W+', '-', 'g'))) END,
            'tag', tag.content, 'num_articles', num_articles --  'count', count
          ) ORDER BY tag_id IS NULL DESC, t.num_articles DESC, tag.created_at ASC))[1:50]
      ) AS top_tags
    FROM (
      SELECT a.author_id, tag_id, -- concat(tag_id, '-', trim(both '-' from regexp_replace(tag_content, '\W+', '-', 'g'))) AS id_slug,
        COUNT(*) ::int AS num_articles
      FROM article a LEFT JOIN article_tag at ON article_id=a.id
      GROUP BY 1, 2
    ) t LEFT JOIN tag ON tag_id=tag.id
    GROUP BY 1 -- author_id ORDER BY RANDOM() LIMIT 5
  ), article_stats_author_tags AS (
    SELECT a.author_id, COUNT(DISTINCT tag_id) ::int AS num_tags
    FROM article a LEFT JOIN article_tag at ON article_id=a.id
    GROUP BY 1 -- , 2
  ), apprs_rvcd AS (
   SELECT recipient_id,
      count(*) ::int AS count,
      count(DISTINCT reference_id) ::int AS num_articles,
      count(DISTINCT sender_id) ::int AS num_senders,
      sum(amount) ::int AS sum_amount,
      max(created_at) AS last_at
     FROM appreciation -- appr JOIN article a ON reference_id=a.id
    GROUP BY 1
  ), apprs_sent AS (
   SELECT sender_id,
      count(*) ::int AS count,
      count(DISTINCT reference_id) ::int AS num_articles,
      count(DISTINCT recipient_id) ::int AS num_authors,
      sum(amount) ::int AS sum_amount,
      max(created_at) AS last_at
     FROM appreciation -- appr JOIN article a ON reference_id=a.id
    GROUP BY 1
  ), last_comments AS (
    SELECT c.author_id,
      count(*) ::int AS total_comments,
      count(DISTINCT c.target_id) ::int AS num_articles,
      count(DISTINCT a.author_id) ::int AS num_commented_authors,
      -- sum((SELECT COUNT(*) FROM regexp_matches(regexp_replace(c.content, '<[^\>]+>', '', 'g'), '\w', 'g'))) ::int AS total_word_count,
      max(c.updated_at) AS last_at
    FROM comment c JOIN article a ON c.type = 'article' AND c.target_id = a.id -- WHERE c.type = 'article'
    GROUP BY 1
  ), last_comments_per_month AS (
    SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'month', month, 'num_comments', num_comments, -- 'num_authors', num_authors
          'num_commented_authors', num_commented_authors,
          -- 'sum_word_count', sum_word_count,
          'month_last', month_last, 'last_5', last_5
        ) ORDER BY month DESC))[1:18]
      ) AS stats
    FROM (
      SELECT c.author_id, date_trunc('month', c.created_at) ::date AS month,
        MAX(c.created_at) AS month_last,
        COUNT(c.id) ::int AS num_comments, -- COUNT(DISTINCT author_id) ::int AS num_authors
        COUNT(DISTINCT a.author_id) ::int AS num_commented_authors,
        -- SUM((SELECT COUNT(*) FROM regexp_matches(regexp_replace(c.content, '<[^\>]+>', '', 'g'), '\w', 'g'))) ::int AS sum_word_count,
        -- SUM((SELECT COUNT(*) FROM regexp_matches(regexp_replace(c.content, '<[^\>]+>', '', 'g'), '\w', 'g'))) ::int AS sum_word_count,
        (ARRAY_AGG(concat(a.id, '#',
              CASE WHEN c.parent_comment_id IS NOT NULL THEN pg_temp.global_id('Comment', c.parent_comment_id ::int) || '-' ELSE '' END,
              pg_temp.global_id('Comment', c.id ::int) ))
        )[1:5] AS last_5
      FROM comment c JOIN article a ON c.type = 'article' AND c.target_id = a.id -- WHERE c.type = 'article'
      WHERE a.state IN ('active') -- NOT IN ('archived')
      -- WHERE created_at >= date_trunc('month', CURRENT_DATE - '18 months'::interval)
      GROUP BY 1, 2
    ) st
    GROUP BY 1
  ), last_reads AS (
   SELECT ar.user_id,
      count(*) ::int AS count,
      count(DISTINCT ar.article_id) ::int AS num_articles,
      count(DISTINCT article.author_id) ::int AS num_read_authors,
      sum(ar.read_time) ::int AS sum_read_time,
      sum(ar.timed_count) ::int AS timed_count,
      max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
     FROM article
       JOIN article_read_count ar ON ar.article_id = article.id
    WHERE ar.user_id IS NOT NULL
    GROUP BY 1
  ), donations_sent AS (
   SELECT sender_id ::int AS user_id,
      count(*) ::int AS count,
      COALESCE(sum(amount) FILTER (WHERE currency = 'LIKE') ::int, 0) AS sum_like,
      COALESCE(sum(amount) FILTER (WHERE currency = 'HKD') ::int, 0) AS sum_hkd,
      count(DISTINCT target_id) ::int AS num_articles,
      count(DISTINCT recipient_id) ::int AS num_authors,
      max(created_at) AS last_at
     FROM transaction
    WHERE -- sender_id IS NOT NULL AND recipient_id IS NOT NULL AND
          state = 'succeeded' AND purpose = 'donation'
      AND target_type = 4 -- article
    GROUP BY 1
  ), donations_rcvd AS (
   SELECT recipient_id ::int AS user_id,
      count(*) ::int AS count,
      COALESCE(sum(amount) FILTER (WHERE currency = 'LIKE') ::int, 0) AS sum_like,
      COALESCE(sum(amount) FILTER (WHERE currency = 'HKD') ::int, 0) AS sum_hkd,
      count(DISTINCT target_id) ::int AS num_articles,
      count(DISTINCT sender_id) ::int AS num_donators,
      max(created_at) AS last_at
     FROM transaction
    WHERE -- sender_id IS NOT NULL AND recipient_id IS NOT NULL AND
          state = 'succeeded' AND purpose = 'donation'
      AND target_type = 4 -- article
    GROUP BY 1
  ), transactions_sent AS (
    SELECT sender_id ::int AS user_id, currency,
      COUNT(*), SUM(amount) AS amount_total
    FROM transaction
    WHERE state IN ('succeeded')
    GROUP BY 1, 2
  ), transactions_rcvd AS (
    SELECT recipient_id ::int AS user_id, currency,
      COUNT(*), SUM(amount) AS amount_total
    FROM transaction
    WHERE state IN ('succeeded')
    GROUP BY 1, 2
  ) /* ,  article_reads AS (
   SELECT author_id, top_5, num_articles, num_readers, count_reads, sum_read_time, sum_timed_count, last_at
     FROM ( SELECT a.author_id,
              (array_agg(a.id || '-' || slug || '-' || media_hash ORDER BY num_readers DESC, sum_read_time DESC))[1:5] AS top_5
             FROM ( SELECT article_id,
                      count(*) ::int AS count,
                      count(DISTINCT user_id) ::int AS num_readers,
                      sum(read_time) ::int AS sum_read_time,
                      sum(timed_count) ::int AS sum_timed_count,
                      max(GREATEST(updated_at, last_read)) AS last_at
                     FROM article_read_count
                    WHERE user_id IS NOT NULL
                    GROUP BY 1
               ) r JOIN article a ON r.article_id = a.id
            GROUP BY 1
       ) aa
       JOIN ( SELECT article.author_id,
              count(DISTINCT ar.article_id) ::int AS num_articles,
              count(DISTINCT ar.user_id) ::int AS num_readers,
              count(*) ::int AS count_reads,
              sum(ar.read_time) ::int AS sum_read_time,
              sum(ar.timed_count) ::int AS sum_timed_count,
              max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
             FROM article
               JOIN article_read_count ar ON ar.article_id = article.id
            WHERE ar.user_id IS NOT NULL
            GROUP BY 1
       ) a1 USING (author_id)
  ) */

SELECT u.user_name, u.display_name, u.id ::int,
    GREATEST(u.updated_at, a.last_at, aps.last_at, lc.last_at, lr.last_at, lds.last_at) AS last_at,
    (GREATEST(u.updated_at, a.last_at, aps.last_at, lc.last_at, lr.last_at, lds.last_at) + '1 day'::interval - '1 microsecond'::interval) ::date - u.created_at ::date AS span_days,
    COALESCE(a.num_articles, 0) AS num_articles,
    -- COALESCE(ar.num_readers, 0) AS num_readers,
    COALESCE(lr.num_read_authors, 0) AS num_read_authors,
    COALESCE(lc.num_commented_authors, 0) AS num_commented_authors,
    -- COALESCE(aps.num_authors, 0) AS num_appr_sent_authors,
    COALESCE(apr.num_senders, 0) AS num_appr_senders,
    -- COALESCE(aps.sum_amount, 0) AS appr_sent_amount,
    -- COALESCE(apr.sum_amount, 0) AS appr_rcvd_amount,
    -- round(COALESCE(ar.sum_read_time, 0)::numeric / 3600.0, 1) ::float AS readby_time_hours,
    round(COALESCE(lr.sum_read_time, 0)::numeric / 3600.0, 1) ::float AS reading_time_hours,
    u.email, u.state, u.created_at, u.eth_address,
    (u.password_hash IS NULL AND u.eth_address IS NOT NULL) AS eth_registered,

    -- CASE WHEN u.avatar IS NOT NULL THEN 'https://assets.matters.news/processed/144w/' || asset.path ELSE NULL END AS avatar,
    pg_temp.avatar_url(asset.path) AS avatar,
    ( SELECT to_jsonb(array_agg(o.o ORDER BY (o.o -> 'last_at') DESC NULLS LAST)) AS to_jsonb
           FROM unnest(ARRAY[
             jsonb_build_object('last_at', u.updated_at, 'action', 'update-info'),
             jsonb_build_object('last_at', lr.last_at, 'action', 'reading'),
             jsonb_build_object('last_at', aps.last_at, 'action', 'appr-ing'),
             jsonb_build_object('last_at', lds.last_at, 'action', 'donat-ing'),
             jsonb_build_object('last_at', lc.last_at, 'action', 'comment-ing'),
             jsonb_build_object('last_at', a.last_at, 'action', 'publishing')
          ]) o(o)
          WHERE (o.o ->> 'last_at') IS NOT NULL) AS last_acts,
    to_jsonb(u.*) - '{uuid,password_hash,base_gravity,curr_gravity,payment_pointer,payment_password_hash,mobile,remark,email_verified}'::text[]
      || jsonb_build_object('eth_registered', password_hash IS NULL AND eth_address IS NOT NULL) AS detail,
    to_jsonb(lr.*) - 'user_id' AS last_reads,
    to_jsonb(aps.*) - 'sender_id' AS apprs_sent,
    to_jsonb(lc.*) - 'author_id' AS last_comments,
    to_jsonb(a.*) - 'author_id' AS articles,
    to_jsonb(lds.*) - 'user_id' AS donations_sent,
    -- to_jsonb(ar.*) - 'author_id' AS article_reads,
    to_jsonb(apr.*) - 'recipient_id' AS apprs_rvcd,
    to_jsonb(ldr.*) - 'user_id' AS donations_rcvd,
    trs.balances
   FROM "user" u
     LEFT JOIN (SELECT *
      FROM author_articles
      JOIN article_stats_per_month USING(author_id)
      JOIN article_stats_per_tag USING(author_id)
      JOIN article_stats_author_tags USING(author_id)
    ) a ON a.author_id = u.id
     LEFT JOIN apprs_rvcd apr ON apr.recipient_id = u.id
     LEFT JOIN apprs_sent aps ON aps.sender_id = u.id
     LEFT JOIN (SELECT * FROM last_comments JOIN last_comments_per_month USING(author_id) ) lc ON lc.author_id = u.id
     LEFT JOIN last_reads lr ON lr.user_id = u.id
     -- LEFT JOIN article_reads ar ON ar.author_id = u.id
     LEFT JOIN donations_sent lds ON lds.user_id = u.id
     LEFT JOIN donations_rcvd ldr ON ldr.user_id = u.id
     LEFT JOIN (
      SELECT user_id, to_jsonb(ARRAY_AGG(to_jsonb(t.*) - 'user_id')) AS balances
      FROM (
        SELECT user_id, currency,
          ts.count AS sent_count, tr.count AS rcvd_count,
          ROUND(ts.amount_total, 2) AS sent_amount_total,
          ROUND(tr.amount_total, 2) AS rcvd_amount_total,
          ROUND(tr.amount_total - ts.amount_total, 2) AS balance
        FROM transactions_sent ts
        JOIN transactions_rcvd tr USING (user_id, currency)
      ) t
      GROUP BY 1
    ) trs ON trs.user_id = u.id
     LEFT JOIN public.asset ON asset.type = 'avatar' AND u.avatar = asset.id
    ;

-- ALTER TABLE :schema.:tablename ADD PRIMARY KEY (id), ADD UNIQUE (user_name);
ALTER TABLE :schema.:tablename
  ADD PRIMARY KEY (id),
  ALTER COLUMN user_name SET NOT NULL,
  ADD UNIQUE (user_name),
  -- ALTER COLUMN display_name SET NOT NULL,
  ADD UNIQUE (email),
  ADD UNIQUE (eth_address)
;


-- the number of records should equal to
SELECT COUNT(*) FROM public."user" ;
SELECT COUNT(*) FROM :schema.:tablename ;

DROP VIEW IF EXISTS :schema.users_lasts ;
CREATE OR REPLACE VIEW :schema.users_lasts AS SELECT * FROM :schema.:tablename ;

COMMENT ON TABLE :schema.:tablename IS :comment ;
COMMENT ON VIEW :schema.users_lasts IS :comment ;
--  could be better if dynamically concat comment string,...
