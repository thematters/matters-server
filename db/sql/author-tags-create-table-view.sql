
SHOW work_mem ;
SET work_mem TO '1 GB';
SHOW work_mem ;

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS asset_type_index ON asset(type) ;

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
    FROM public.article
    WHERE state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1
  ), articles_appr AS (
    SELECT a.id ::int, COUNT(*) ::int AS num_apprtors,
      SUM(amount) ::int AS sum_appreciations
    FROM public.article a
    LEFT JOIN appreciation appr ON appr.reference_id = a.id
    WHERE a.state IN ('active') AND purpose IN ('appreciate')
    GROUP BY 1
  ), article_stats_per_month AS (
    SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'month', month, 'num_articles', num_articles, -- 'num_authors', num_authors
          'sum_word_count', sum_word_count, 'month_last', month_last, 'last_5', last_5
        ) ORDER BY month DESC)) -- [1:18]
      ) AS stats
    FROM (
      SELECT author_id, date_trunc('month', created_at) ::date AS month,
        MAX(created_at) AS month_last,
        COUNT(a.id) ::int AS num_articles, -- COUNT(DISTINCT author_id) ::int AS num_authors
        sum(a.word_count) ::int AS sum_word_count,
        (ARRAY_AGG(jsonb_build_object(
              'title', a.title,
              'path', concat(a.id, '-', a.slug, '-', a.media_hash),
              'num_apprtors', num_apprtors,
              'sum_appreciations', sum_appreciations
          ) ORDER BY a.created_at DESC))[1:5] AS last_5
      FROM articles_appr JOIN public.article a USING(id)
      -- LEFT JOIN appreciation appr ON appr.reference_id = a.id
      -- WHERE a.state IN ('active') -- NOT IN ('archived', 'banned')
      GROUP BY 1, 2
    ) st
    GROUP BY 1
  ), article_stats_per_tag AS ( -- SELECT 1 AS author_id
    SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
            'id_tag', CASE WHEN tag_id IS NULL THEN NULL ELSE concat(tag.id, '-', trim(both '-' from regexp_replace(tag.content, '\W+', '-', 'g'))) END,
            'id', tag.id ::int, 'tag', tag.content, 'num_articles', num_articles,
            'sum_word_count', sum_word_count, 'last_use', last_use, 'last_5', last_5
          ) ORDER BY tag_id IS NULL DESC, t.num_articles DESC, tag.created_at ASC))[1:100]
      ) AS top_tags
    FROM (
      SELECT a.author_id, tag_id, -- concat(tag_id, '-', trim(both '-' from regexp_replace(tag_content, '\W+', '-', 'g'))) AS id_slug,
        MAX(at.created_at) AS last_use,
        COUNT(*) ::int AS num_articles,
        sum(a.word_count) ::int AS sum_word_count,
        (ARRAY_AGG(jsonb_build_object(
              'title', a.title, 'date', a.created_at ::date,
              'path', concat(a.id, '-', a.slug, '-', a.media_hash),
              'num_apprtors', num_apprtors,
              'sum_appreciations', sum_appreciations
          ) ORDER BY a.created_at DESC))[1:5] AS last_5
      FROM public.article a JOIN articles_appr USING(id)
      LEFT JOIN article_tag at ON article_id=a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      GROUP BY 1, 2
    ) t LEFT JOIN tag ON tag_id=tag.id
    GROUP BY 1 -- author_id ORDER BY RANDOM() LIMIT 5
  ), article_stats_author_tags AS (
    SELECT a.author_id, COUNT(DISTINCT tag_id) ::int AS num_tags
    FROM public.article a LEFT JOIN article_tag at ON article_id=a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1 -- , 2
  ), article_reads AS (
    SELECT -- author_id, top_5, num_articles, num_articles_r3m, num_readers, num_readers_r3m, count_reads, sum_read_time, sum_timed_count, last_at
      ar.*, -- top_5
      ARRAY( SELECT to_jsonb(top.*)
        FROM jsonb_to_recordset(top_articles) AS top(title text, path text, num_readers INT, num_readers_w3m INT, sum_read_time INT, last_at timestamptz)
        ORDER BY num_readers_w3m DESC, num_readers DESC, sum_read_time DESC LIMIT 5 ) AS top_5
    FROM (
      SELECT a.author_id,
        -- (array_agg(a.id || '-' || slug || '-' || media_hash ORDER BY num_readers DESC, sum_read_time DESC))[1:5] AS top_5
        to_jsonb(array_agg(DISTINCT jsonb_build_object(
              'title', a.title,
              'path', concat(a.id, '-', slug, '-', media_hash),
              'num_readers', num_readers, 'num_readers_w3m', num_readers_w3m,
              'sum_read_time', sum_read_time, 'last_at', last_at
            ) -- ORDER BY num_readers DESC, sum_read_time DESC
            -- ERROR:  in an aggregate with DISTINCT, ORDER BY expressions must -- appear in argument list
        )) AS top_articles
      FROM (
        SELECT article_id,
          count(*) ::int AS count,
          count(DISTINCT user_id) ::int AS num_readers,
          count(DISTINCT user_id) FILTER(WHERE age(created_at ::date) <= '3 months'::interval) ::int AS num_readers_w3m,
          sum(read_time) ::int AS sum_read_time,
          sum(timed_count) ::int AS sum_timed_count,
          max(GREATEST(updated_at, last_read)) AS last_at
        FROM article_read_count
        WHERE user_id IS NOT NULL
        GROUP BY 1
      ) r JOIN public.article a ON r.article_id = a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      GROUP BY 1
    ) aa
    JOIN (
      SELECT a.author_id,
        count(DISTINCT ar.article_id) ::int AS num_articles,
        count(DISTINCT ar.article_id) FILTER(WHERE age(date(ar.created_at AT TIME ZONE 'UTC'))<='3 months'::interval) ::int AS num_articles_r3m,
        count(DISTINCT ar.user_id) ::int AS num_readers,
        count(DISTINCT ar.user_id) FILTER(WHERE age(ar.created_at)<='3 months'::interval) ::int AS num_readers_r3m,
        count(*) ::int AS count_reads,
        sum(ar.read_time) ::int AS sum_read_time,
        sum(ar.timed_count) ::int AS sum_timed_count,
        max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
      FROM public.article_read_count ar
      JOIN public.article a ON ar.article_id = a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      -- WHERE ar.user_id IS NOT NULL
      GROUP BY 1
    ) ar USING (author_id)
  ), article_stats_by_readers AS (
    SELECT * FROM (
      SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'user_name', user_name, 'display_name', display_name,
          'sum_read_time', sum_read_time, 'sum_timed_count', sum_timed_count,
          'last_at', last_at, 'count', count
        ) ORDER BY count DESC, sum_read_time DESC))[1:100]) AS top_readers
      FROM (
        SELECT author_id, user_id, COUNT(*) ::int,
         sum(ar.read_time) ::int AS sum_read_time,
         sum(ar.timed_count) ::int AS sum_timed_count,
         max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
         FROM public.article_read_count ar
           JOIN public.article a ON ar.article_id = a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
         GROUP BY 1, 2
      ) au
      LEFT JOIN public."user" u ON user_id=u.id
      GROUP BY 1
    ) a1 FULL JOIN (
      SELECT author_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'user_name', user_name, 'display_name', display_name,
          'sum_read_time', sum_read_time, 'sum_timed_count', sum_timed_count,
          'last_at', last_at, 'count', count
        ) ORDER BY count DESC, sum_read_time DESC))[1:100]) AS top_readers_r3m
      FROM (
        SELECT author_id, user_id, COUNT(*) ::int,
         sum(ar.read_time) ::int AS sum_read_time,
         sum(ar.timed_count) ::int AS sum_timed_count,
         max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
         FROM public.article_read_count ar
           JOIN public.article a ON ar.article_id = a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
         WHERE age(ar.created_at) <= '3 months'::interval
         GROUP BY 1, 2
      ) au
      LEFT JOIN public."user" u ON user_id=u.id
      GROUP BY 1
    ) a2 USING(author_id)
  )

SELECT u.user_name, u.display_name, u.id ::int,
    -- GREATEST(u.updated_at, a.last_at) AS last_at,
    -- GREATEST(u.updated_at, a.last_at) ::date - u.created_at ::date AS span_days,
    a.last_at,

    -- ceiling to next day
    (a.last_at + '1 day'::interval - '1 microsecond'::interval)::date - u.created_at ::date AS span_days,
    -- (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days

    -- COALESCE(a.num_articles, 0) AS num_articles,
    a.num_articles, a.sum_word_count,
    -- COALESCE(lr.num_read_authors, 0) AS num_read_authors,
    -- COALESCE(lc.num_commented_authors, 0) AS num_commented_authors,
    -- COALESCE(aps.num_authors, 0) AS num_appr_sent_authors,
    -- COALESCE(apr.num_senders, 0) AS num_appr_senders,
    -- COALESCE(aps.sum_amount, 0) AS appr_sent_amount,
    -- COALESCE(apr.sum_amount, 0) AS appr_rcvd_amount,
    -- round(COALESCE(lr.sum_read_time, 0)::numeric / 3600.0, 1) ::float AS reading_time_hours,
    u.email, u.state, u.created_at, u.eth_address,
    /* CASE -- WHEN starts_with(asset.path, 'imgCached/') THEN 'https://assets.matters.news/' ||
         WHEN u.avatar IS NOT NULL THEN 'https://assets.matters.news/processed/144w/' || asset.path
      ELSE NULL END AS avatar, */
    -- pg_temp.avatar_url(asset.path) AS avatar,
    u.avatar ::int,
    /* ( SELECT to_jsonb(array_agg(o.o ORDER BY (o.o -> 'last_at') DESC NULLS LAST)) AS to_jsonb
           FROM unnest(ARRAY[
             jsonb_build_object('last_at', u.updated_at, 'action', 'update-info'),
             -- jsonb_build_object('last_at', lr.last_at, 'action', 'reading'),
             -- jsonb_build_object('last_at', aps.last_at, 'action', 'appr-ing'),
             -- jsonb_build_object('last_at', lds.last_at, 'action', 'donat-ing'),
             -- jsonb_build_object('last_at', lc.last_at, 'action', 'comment-ing'),
             jsonb_build_object('last_at', a.last_at, 'action', 'publishing')
          ]) o(o)
          WHERE (o.o ->> 'last_at') IS NOT NULL) AS last_acts, */
    num_tags, top_tags,
    COALESCE(ar.num_readers, 0) AS num_readers,
    COALESCE(ar.num_readers_r3m, 0) AS num_readers_r3m,
    top_readers, top_readers_r3m,
    round(COALESCE(ar.sum_read_time, 0)::numeric / 3600.0, 1) ::float AS readby_time_hours,
    to_jsonb(u.*) - '{uuid,password_hash,base_gravity,curr_gravity,payment_pointer,payment_password_hash,mobile,remark,email_verified}'::text[]
      || jsonb_build_object('eth_registered', password_hash IS NULL AND eth_address IS NOT NULL) AS detail,
    -- to_jsonb(lr.*) - 'user_id' AS last_reads,
    -- to_jsonb(aps.*) - 'sender_id' AS apprs_sent,
    -- to_jsonb(lc.*) - 'author_id' AS last_comments,
    -- a.*,
    -- to_jsonb(a.*) - 'author_id' AS articles,
    -- to_jsonb(lds.*) - 'sender_id' AS donations_sent,
    top_5, to_jsonb(ar.*) - '{author_id,top_5}'::text[] AS article_reads,
    -- to_jsonb(apr.*) - 'recipient_id' AS apprs_rvcd,
    -- to_jsonb(ldr.*) - 'recipient_id' AS donations_rvcd
    a.stats AS author_stats
   FROM "user" u
     JOIN (SELECT *
      FROM author_articles
      LEFT JOIN article_stats_per_month USING(author_id)
      LEFT JOIN article_stats_per_tag USING(author_id)
      LEFT JOIN article_stats_author_tags USING(author_id)
      LEFT JOIN article_stats_by_readers USING(author_id)
    ) a ON a.author_id = u.id
     -- LEFT JOIN apprs_rvcd apr ON apr.recipient_id = u.id
     -- LEFT JOIN apprs_sent aps ON aps.sender_id = u.id
     -- LEFT JOIN (SELECT * FROM last_comments JOIN last_comments_per_month USING(author_id) ) lc ON lc.author_id = u.id
     -- LEFT JOIN last_reads lr ON lr.user_id = u.id
     LEFT JOIN article_reads ar ON ar.author_id = u.id
     -- LEFT JOIN donations_sent lds ON lds.sender_id = u.id
     -- LEFT JOIN donations_rcvd ldr ON ldr.recipient_id = u.id
     -- LEFT JOIN public.asset ON asset.type = 'avatar' AND u.avatar = asset.id
    -- WHERE u.state NOT IN ('archived')
    WHERE state IN ('active') -- NOT IN ('archived', 'banned')
    ;

ALTER TABLE :schema.:tablename
  ADD PRIMARY KEY (id),
  ALTER COLUMN user_name SET NOT NULL,
  ADD UNIQUE (user_name),
  -- ALTER COLUMN display_name SET NOT NULL,
  ADD UNIQUE (email),
  ADD UNIQUE (eth_address)
  ;

-- the number of records should equal to number of author_id(s) in
-- `public.article`
SELECT COUNT(DISTINCT author_id) FROM public.article WHERE state IN ('active') ; -- NOT IN ('archived', 'banned');
SELECT COUNT(*) FROM :schema.:tablename ;

DROP VIEW IF EXISTS :schema.authors_lasts ;
CREATE OR REPLACE VIEW :schema.authors_lasts AS SELECT * FROM :schema.:tablename ;

COMMENT ON TABLE :schema.:tablename IS :comment ;
COMMENT ON VIEW :schema.authors_lasts IS :comment ;
--  could be better if dynamically concat comment string,...
