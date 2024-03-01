
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
  WITH uniq_articles AS (
    SELECT DISTINCT article_id FROM article_circle
  ), circle_articles AS (
    SELECT circle_id, a.id, a.author_id, avn.title, '' as slug, avn.word_count, avn.data_hash, avn.media_hash, ac.created_at, ac.updated_at
    FROM article_circle ac
    JOIN public.article a ON ac.article_id=a.id AND a.state IN ('active')
    JOIN public.article_version_newest avn ON a.id=avn.article_id
  ), circle_articles_stats AS (
    SELECT circle_id,
      count(*) ::int AS num_articles,
      sum(word_count) ::int AS sum_word_count,
      max(updated_at) AS last_at
    FROM circle_articles -- article_circle ac LEFT JOIN public.article a ON ac.article_id=a.id
    -- WHERE state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1
  ), articles_appr AS (
    SELECT a.id ::int, COUNT(*) ::int AS num_apprtors,
      SUM(amount) ::int AS sum_appreciations
    FROM circle_articles a -- article_circle ac LEFT JOIN public.article a ON ac.article_id=a.id
    LEFT JOIN appreciation appr ON appr.reference_id = a.id AND purpose IN ('appreciate')
    GROUP BY 1
  ), circle_subscriptions_stat AS (
    SELECT circle_id ::int,
      ARRAY_AGG(DISTINCT circle_price.amount) AS prices,
      COUNT(DISTINCT csi.user_id) ::int AS num_members
    FROM circle_subscription_item AS csi
    JOIN circle_price ON circle_price.id=csi.price_id
    JOIN circle_subscription AS cs ON cs.id=csi.subscription_id
    WHERE circle_price.state IN ('active')
      AND NOT csi.archived
      AND cs.state IN ('trialing', 'active')
    GROUP BY 1
  ), action_circle_stats AS (
    SELECT circle_id, to_jsonb(ARRAY_AGG(jsonb_build_object(
        'action', action, 'num_users', num_users
      ))) AS followers
    FROM (
      SELECT target_id ::int AS circle_id, action, COUNT(DISTINCT user_id) ::int AS num_users
      FROM action_circle
      GROUP BY 1, 2
    ) t
    GROUP BY 1
  ), article_stats_per_month AS (
    SELECT circle_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'month', month, 'num_articles', num_articles, -- 'num_authors', num_authors
          'sum_word_count', sum_word_count, 'month_last', month_last, 'last_5', last_5
        ) ORDER BY month DESC))[1:18]
      ) AS stats
    FROM (
      SELECT circle_id, date_trunc('month', created_at) ::date AS month,
        MAX(created_at) AS month_last,
        COUNT(a.id) ::int AS num_articles, -- COUNT(DISTINCT author_id) ::int AS num_authors
        SUM(a.word_count) ::int AS sum_word_count,
        (ARRAY_AGG(jsonb_build_object(
              'title', avn.title,
              'path', concat(a.id),
              'num_apprtors', num_apprtors,
              'sum_appreciations', sum_appreciations
        ) ORDER BY a.created_at DESC))[1:5] AS last_5
      FROM articles_appr -- JOIN ( SELECT circle_id, a.* FROM circle_article JOIN public.article a ON article_id=a.id)
      JOIN circle_articles a USING(id)
      JOIN article_version_newest avn ON a.id=avn.article_id
      -- LEFT JOIN appreciation appr ON appr.reference_id = a.id
      -- WHERE a.state IN ('active') -- NOT IN ('archived', 'banned')
      GROUP BY 1, 2
    ) st
    GROUP BY 1
  ), article_stats_per_tag AS ( -- SELECT 1 AS author_id
    SELECT circle_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
            'id_tag', CASE WHEN tag_id IS NULL THEN NULL ELSE concat(tag.id, '-', trim(both '-' from regexp_replace(tag.content, '\W+', '-', 'g'))) END,
            'id', tag.id ::int, 'tag', tag.content, 'num_articles', num_articles,
            'sum_word_count', sum_word_count, 'last_use', last_use, 'last_5', last_5
          ) ORDER BY tag_id IS NULL DESC, date_trunc('month', t.last_use) ::date DESC, t.num_articles DESC, tag.created_at ASC))[1:100]
      ) AS top_tags
    FROM (
      SELECT circle_id, tag_id, -- concat(tag_id, '-', trim(both '-' from regexp_replace(tag_content, '\W+', '-', 'g'))) AS id_slug,
        MAX(at.created_at) AS last_use,
        COUNT(*) ::int AS num_articles,
        sum(a.word_count) ::int AS sum_word_count,
        (ARRAY_AGG(jsonb_build_object(
              'title', avn.title, 'date', a.created_at ::date,
              'path', concat(a.id),
              'num_apprtors', num_apprtors,
              'sum_appreciations', sum_appreciations
          ) ORDER BY a.created_at DESC))[1:5] AS last_5
      FROM circle_articles a -- article_circle ac LEFT JOIN public.article a ON ac.article_id=a.id
      JOIN articles_appr USING(id)
      JOIN article_version_newest avn ON a.id=avn.article_id
      LEFT JOIN article_tag at ON article_id=a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      GROUP BY 1, 2
    ) t LEFT JOIN tag ON tag_id=tag.id
    GROUP BY 1 -- author_id ORDER BY RANDOM() LIMIT 5
  ), article_stats_author_tags AS (
    SELECT circle_id, COUNT(DISTINCT tag_id) ::int AS num_tags
    FROM circle_articles a -- article_circle ac LEFT JOIN public.article a ON ac.article_id=a.id
    LEFT JOIN article_tag at ON article_id=a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1 -- , 2
  ), article_reads AS (
    SELECT -- author_id, top_5, num_articles, num_articles_r3m, num_readers, num_readers_r3m, count_reads, sum_read_time, sum_timed_count, last_at
      ar.*, -- top_5
      to_jsonb(ARRAY( SELECT to_jsonb(top.*)
        FROM jsonb_to_recordset(top_articles) AS top(title text, path text, num_readers INT, num_readers_w3m INT, sum_read_time INT, last_at timestamptz)
        ORDER BY num_readers_w3m DESC, num_readers DESC, sum_read_time DESC LIMIT 5 )) AS top_5
    FROM ( SELECT circle_id,
      to_jsonb(array_agg(DISTINCT jsonb_build_object(
            'title', avn.title,
            'path', a.id,
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
        -- JOIN circle_articles ON a.id=ar.article_id -- AND a.state IN ('active')
        WHERE user_id IS NOT NULL
          AND article_id IN (SELECT article_id FROM uniq_articles)
        GROUP BY 1
      ) r JOIN circle_articles a ON r.article_id = a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      JOIN article_version_newest avn ON r.article_id=avn.article_id
      GROUP BY 1
    ) aa
    JOIN (
      SELECT circle_id,
        count(DISTINCT ar.article_id) ::int AS num_articles,
        count(DISTINCT ar.article_id) FILTER(WHERE age(date(ar.created_at AT TIME ZONE 'UTC'))<='3 months'::interval) ::int AS num_articles_r3m,
        count(DISTINCT ar.user_id) ::int AS num_readers,
        count(DISTINCT ar.user_id) FILTER(WHERE age(ar.created_at)<='3 months'::interval) ::int AS num_readers_r3m,
        count(*) ::int AS count_reads,
        sum(ar.read_time) ::int AS sum_read_time,
        sum(ar.timed_count) ::int AS sum_timed_count,
        max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
      FROM public.article_read_count ar
      JOIN circle_articles a ON ar.article_id = a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
      -- WHERE a.id IN (SELECT article_id FROM uniq_articles)
      -- WHERE ar.user_id IS NOT NULL
      GROUP BY 1
    ) ar USING (circle_id)
    -- , UNNEST(top_articles) AS top(title text, path text, num_readers INT, sum_read_time INT)
  ), article_stats_by_readers AS (
    SELECT * FROM (
      SELECT circle_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'user_name', user_name, 'display_name', display_name,
          'sum_read_time', sum_read_time, 'sum_timed_count', sum_timed_count,
          'last_at', last_at, 'count', count
        ) ORDER BY count DESC, sum_read_time DESC))[1:100]) AS top_readers
      FROM (
        SELECT circle_id, user_id, COUNT(*) ::int,
         sum(ar.read_time) ::int AS sum_read_time,
         sum(ar.timed_count) ::int AS sum_timed_count,
         max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
        FROM public.article_read_count ar
        JOIN circle_articles a ON ar.article_id = a.id
        GROUP BY 1, 2
      ) au
      LEFT JOIN public."user" u ON user_id=u.id
      GROUP BY 1
    ) a1 FULL JOIN (
      SELECT circle_id, to_jsonb((ARRAY_AGG(jsonb_build_object(
          'user_name', user_name, 'display_name', display_name,
          'sum_read_time', sum_read_time, 'sum_timed_count', sum_timed_count,
          'last_at', last_at, 'count', count
        ) ORDER BY count DESC, sum_read_time DESC))[1:100]) AS top_readers_r3m
      FROM (
        SELECT circle_id, user_id, COUNT(*) ::int,
         sum(ar.read_time) ::int AS sum_read_time,
         sum(ar.timed_count) ::int AS sum_timed_count,
         max(GREATEST(ar.updated_at, ar.last_read)) AS last_at
        FROM public.article_read_count ar
        JOIN circle_articles a ON ar.article_id = a.id -- AND a.state IN ('active') -- NOT IN ('archived', 'banned')
        WHERE age(ar.created_at) <= '3 months'::interval
          AND a.id IN (SELECT article_id FROM uniq_articles)
        GROUP BY 1, 2
      ) au
      LEFT JOIN public."user" u ON user_id=u.id
      GROUP BY 1
    ) a2 USING(circle_id)
  )

SELECT
    c.id ::int, c.name, c.display_name, c.description,
    -- u.id ::int AS author_id, u.user_name AS author_name,

    -- c.provider, c.provider_product_id,
    c.created_at, c.updated_at,
    -- u.user_name, u.display_name, u.id ::int,
    -- GREATEST(u.updated_at, a.last_at) AS last_at,
    -- GREATEST(u.updated_at, a.last_at) ::date - u.created_at ::date AS span_days,
    a.last_at,

    -- ceiling to next day
    (a.last_at + '1 day'::interval - '1 microsecond'::interval) ::date - c.created_at ::date AS span_days,
    -- (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days

    c.cover ::int, c.avatar ::int, c.state,

    -- COALESCE(a.num_articles, 0) AS num_articles,
    a.num_articles, a.sum_word_count,
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

    prices, num_members,
    (SELECT x.num_users FROM jsonb_to_recordset(followers) AS x(action text, num_users INT) WHERE action='follow') AS num_followers,
    followers,

    num_tags, top_tags,
    COALESCE(ar.num_readers, 0) AS num_readers,
    COALESCE(ar.num_readers_r3m, 0) AS num_readers_r3m,
    top_readers, top_readers_r3m,
    round(COALESCE(ar.sum_read_time, 0)::numeric / 3600.0, 1) ::float AS readby_time_hours,

    c.owner ::int AS owner_id, u.user_name AS owner_name,
    to_jsonb(u.*) - '{uuid,password_hash,base_gravity,curr_gravity,payment_pointer,payment_password_hash,mobile,remark,email_verified}'::text[]
      || jsonb_build_object('eth_registered', password_hash IS NULL AND eth_address IS NOT NULL) AS owner_detail,
    top_5, to_jsonb(ar.*) - '{circle_id,top_5}'::text[] AS article_reads,
    -- to_jsonb(apr.*) - 'recipient_id' AS apprs_rvcd,
    -- to_jsonb(ldr.*) - 'recipient_id' AS donations_rvcd
    a.stats AS author_stats
  FROM "circle" c
  LEFT JOIN "user" u ON c.owner=u.id
  LEFT JOIN (
    SELECT *
    FROM circle_articles_stats
    LEFT JOIN circle_subscriptions_stat USING(circle_id)
    LEFT JOIN action_circle_stats USING(circle_id)
    LEFT JOIN article_stats_per_month USING(circle_id)
    LEFT JOIN article_stats_per_tag USING(circle_id)
    LEFT JOIN article_stats_author_tags USING(circle_id)
    LEFT JOIN article_stats_by_readers USING(circle_id)
  ) a ON a.circle_id = c.id
  LEFT JOIN article_reads ar ON ar.circle_id = c.id
  -- WHERE state IN ('active') -- NOT IN ('archived', 'banned')
  ;

ALTER TABLE :schema.:tablename
  ADD PRIMARY KEY (id),
  ALTER COLUMN name SET NOT NULL,
  ADD UNIQUE (name),
  ALTER COLUMN owner_id SET NOT NULL,
  ADD UNIQUE (owner_id),
  ALTER COLUMN owner_name SET NOT NULL,
  ADD UNIQUE (owner_name)
  -- ALTER COLUMN user_name SET NOT NULL,
  -- ADD UNIQUE (user_name),
  -- ALTER COLUMN display_name SET NOT NULL,
  -- ADD UNIQUE (email),
  -- ADD UNIQUE (eth_address)
  ;

-- the number of records should equal to number of author_id(s) in
-- `public.article`
SELECT COUNT(DISTINCT circle_id) FROM article_circle ;
SELECT COUNT(*) FROM :schema.:tablename ;

DROP VIEW IF EXISTS :schema.circles_lasts ;
CREATE OR REPLACE VIEW :schema.circles_lasts AS SELECT * FROM :schema.:tablename ;

COMMENT ON TABLE :schema.:tablename IS :comment ;
COMMENT ON VIEW :schema.circles_lasts IS :comment ;
--  could be better if dynamically concat comment string,...
