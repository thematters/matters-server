
CREATE OR REPLACE FUNCTION pg_temp.slug(input text) RETURNS text AS $f$
  SELECT COALESCE(
    NULLIF(trim(both '-' from regexp_replace(input, '\W+', '-', 'g')), ''),
    -- NULLIF(trim(both '-' from regexp_replace(input, '[()（）@''’"<>,.?;&＆!│｜|/#＃、，．…：；「」《》？！\\+—\-ㅤ\s]+', '-', 'g')), ''),
    NULLIF(trim(both '-' from regexp_replace(input, '\s+', '-', 'g')), ''),
    input
	)
$f$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION pg_temp.array_distinct(
  anyarray, -- input array
  boolean DEFAULT false -- flag to ignore nulls
) RETURNS anyarray AS $f$
  SELECT array_agg(DISTINCT x)
  FROM unnest($1) t(x)
  WHERE CASE WHEN $2 THEN x IS NOT NULL ELSE true END;
$f$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION pg_temp.array_uniq_stable(anyarray) RETURNS anyarray AS $f$
SELECT
    array_agg(distinct_value ORDER BY first_index)
FROM
    (SELECT
        value AS distinct_value,
        min(index) AS first_index
    FROM
        unnest($1) WITH ORDINALITY AS input(value, index)
    GROUP BY
        value
    ) AS unique_input ;
$f$ LANGUAGE SQL IMMUTABLE STRICT;


CREATE AGGREGATE pg_temp.array_cat_agg(anyarray) (
  SFUNC=array_cat, STYPE=anyarray
);

SHOW work_mem ;
SET work_mem TO '1 GB';
SHOW work_mem ;

ALTER TABLE public.tag ADD COLUMN IF NOT EXISTS major_tag_id BIGINT, ADD COLUMN IF NOT EXISTS slug TEXT ;

-- DROP TABLE IF EXISTS :schema.tag ;
CREATE TABLE pg_temp.tag AS
SELECT id, created_at, updated_at, remark, deleted, starts_with_hash, same_as_slug, cover, description, editors, creator, owner, major_tag_id, is_major_tag,
  content_orig, COALESCE(slug, pg_temp.slug(lower(content))) AS slug
FROM (
  SELECT id, /* content, */ created_at, updated_at, remark, deleted, cover, description, editors, creator, owner, major_tag_id, slug, (major_tag_id IS NULL OR major_tag_id=id) AS is_major_tag,
    content AS content_orig,
    (starts_with(content, '#') OR starts_with(content, '＃')) AS starts_with_hash,
    (content = pg_temp.slug(content)) AS same_as_slug,
    CASE WHEN t1.major_tag_id IS NOT NULL AND t1.major_tag_id != t1.id THEN (SELECT t2.content FROM tag t2 WHERE t2.id=t1.major_tag_id)
      ELSE t1.content
    END AS content -- use t2.content alias
  FROM public.tag t1
) t1 ;
ALTER TABLE pg_temp.tag ADD PRIMARY KEY (id) ;
CREATE INDEX IF NOT EXISTS temp_tag_slug_index ON pg_temp.tag(slug) ;

CREATE TABLE pg_temp.article_tag_stats_by_id AS (
  SELECT tag_id, COUNT(DISTINCT article_id) ::int AS tag_articles, COUNT(DISTINCT author_id) ::int AS tag_authors,
    (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days
  FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
  GROUP BY 1
) ;
ALTER TABLE pg_temp.article_tag_stats_by_id
  ADD PRIMARY KEY (tag_id)
;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE) CREATE TABLE pg_temp.article_tag_rels_by_id AS
WITH tag_uses AS (
  SELECT tag_id ::int, ARRAY_AGG(DISTINCT article_id) AS article_ids, COUNT(DISTINCT article_id) ::int
  -- FROM article_tag
  FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
  GROUP BY 1
), tag_common_count AS (
  SELECT t.tag_id, tag_rel_id, count_common,
    tu1.count AS count_target, tu2.count AS count_rel,
    (tu1.count + tu2.count - count_common) AS count_union
  FROM (
    SELECT tu.tag_id ::int, at.tag_id ::int AS tag_rel_id, COUNT(*) ::int AS count_common
    FROM tag_uses tu
    JOIN article_tag at ON at.article_id =ANY(tu.article_ids) AND (at.tag_id <> tu.tag_id)
    GROUP BY 1, 2
  ) t
  JOIN tag_uses tu1 ON tu1.tag_id=t.tag_id
  JOIN tag_uses tu2 ON tu2.tag_id=t.tag_rel_id
) /*, tag_uses_common AS (
  SELECT tu1.tag_id, tu2.tag_id AS tag_rel_id,
    ARRAY_LENGTH(tu1.article_ids, 1) AS count1,
    -- (SELECT COUNT(1) ::int FROM UNNEST(tu2.article_ids)) AS count2,
    ARRAY_LENGTH(tu2.article_ids, 1) AS count2,
    (SELECT COUNT(DISTINCT article_id) ::int
      FROM (
        SELECT UNNEST(tu1.article_ids)
        INTERSECT
        SELECT UNNEST(tu2.article_ids)
      ) x(article_id)
    ) AS count_common --,    (SELECT COUNT(1) ::int FROM (SELECT UNNEST(tu1.article_ids) UNION DISTINCT SELECT UNNEST(tu2.article_ids)) t) AS count_union
  FROM tag_uses tu1
  JOIN tag_uses tu2
  ON (tu1.tag_id <> tu2.tag_id) AND (tu1.article_ids && tu2.article_ids)
) */ , tag_similarity AS (
  SELECT *, -- (count1+count2-count_common) AS count_union,
    ROUND(count_common ::numeric / count_union, 5) AS similarity,
    ROUND((count_common ::numeric / count_target + count_common ::numeric / count_rel)/2, 5) AS diff_similarity,
    rank() OVER(PARTITION BY tag_id ORDER BY (count_common ::numeric / count_union) DESC, count_common DESC)
  FROM tag_common_count t
)

  SELECT tag_id, to_jsonb((ARRAY_AGG(
      (to_jsonb(ts.*) - '{rank,tag_id,count_target}'::text[] -- || jsonb_build_object('tag_content', tag.content)
      ) ORDER BY rank ASC
    ))[0:100]) AS top_rels
  FROM  tag_similarity ts
  -- JOIN pg_temp.tag ON ts.tag_rel_id=tag.id
  WHERE rank<=100
  GROUP BY 1 ;

ALTER TABLE pg_temp.article_tag_rels_by_id
  ADD PRIMARY KEY (tag_id)
;


DROP TABLE IF EXISTS :schema.article_tag_stats ;
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) CREATE TABLE :schema.article_tag_stats AS
WITH action_tag_stats AS (
  SELECT target_id AS tag_id, action, COUNT(*) ::int AS count,
    COUNT(DISTINCT user_id) ::int AS num_users,
    MIN(created_at) AS earliest,
    MAX(created_at) AS latest,
    -- MAX(created_at) ::date - MIN(created_at) ::date AS span_days
    (MAX(created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(created_at) ::date AS span_days
  FROM public.action_tag
  GROUP BY 1, 2
)

  SELECT t.slug, -- COUNT(*) ::int AS count,
    COUNT(DISTINCT at.article_id) FILTER(WHERE a.state IN ('active')) ::int AS num_articles,
    COUNT(DISTINCT a.author_id) FILTER(WHERE a.state IN ('active')) ::int AS num_authors,
    COUNT(DISTINCT at.article_id) FILTER(WHERE age(at.created_at) <= '3 months'::interval AND a.state IN ('active')) ::int AS num_articles_r3m,
    COUNT(DISTINCT a.author_id) FILTER(WHERE age(at.created_at) <= '3 months'::interval AND a.state IN ('active')) ::int AS num_authors_r3m,
    COUNT(DISTINCT at.article_id) FILTER(WHERE age(at.created_at) <= '1 month'::interval AND a.state IN ('active')) ::int AS num_articles_r1m,
    COUNT(DISTINCT a.author_id) FILTER(WHERE age(at.created_at) <= '1 month'::interval AND a.state IN ('active')) ::int AS num_authors_r1m,
    COUNT(DISTINCT at.article_id) FILTER(WHERE age(at.created_at) <= '2 weeks'::interval AND a.state IN ('active')) ::int AS num_articles_r2w,
    COUNT(DISTINCT a.author_id) FILTER(WHERE age(at.created_at) <= '2 weeks'::interval AND a.state IN ('active')) ::int AS num_authors_r2w,
    COUNT(DISTINCT at.article_id) FILTER(WHERE age(at.created_at) <= '1 week'::interval AND a.state IN ('active')) ::int AS num_articles_r1w,
    COUNT(DISTINCT a.author_id) FILTER(WHERE age(at.created_at) <= '1 week'::interval AND a.state IN ('active')) ::int AS num_authors_r1w,
    -- SUM(art.sum_read_time) FILTER(WHERE art.rank<=20) AS
    -- SUM(sum_read_time_top20_r2w) AS sum_read_time_top20_r2w,
    -- MAX(at.created_at) ::date - MIN(at.created_at) ::date AS span_days,
    -- ( SELECT * FROM UNNEST(pg_temp.array_cat_agg(editors)) ) ::int[] AS merged_editors,
    (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days,
    MIN(at.created_at) AS earliest_use,
    MAX(at.created_at) AS latest_use,
    -- COUNT(DISTINCT t.id) ::int AS num_dups,
    -- to_jsonb(ARRAY[MIN(at.created_at), MAX(at.created_at)]) AS time_range,
    -- to_jsonb((ARRAY_AGG(concat('https://matters.news/@', user_name, '/', a.id, '-', a.slug, '-', a.media_hash) ORDER BY a.created_at DESC))[1:5]) AS last_5,
    /* to_jsonb(ARRAY_AGG(DISTINCT
      jsonb_build_object('user_id', u.id, 'user_name', u.user_name, 'display_name', u.display_name, 'state', u.state
        -- 'age_use', (at.created_at ::date - u.created_at ::date)
      )) FILTER(WHERE age(at.created_at) <= '3 months'::interval)) AS users_w3m, */
    to_jsonb(ARRAY_AGG(DISTINCT jsonb_build_object(
        'id', t.id, 'tag', t.content_orig, 'id_slug', (t.id || '-' || t.slug),
        'tag_articles', tag_articles, 'tag_authors', tag_authors,
        'same_as_slug', t.same_as_slug, -- t.content_orig = pg_temp.slug(t.content_orig),
        'starts_with_hash', t.starts_with_hash, -- (starts_with(content, '#') OR starts_with(content, '＃')),
        'is_major_tag', t.is_major_tag, -- t.major_tag_id=t.id,
        'span_days', at.span_days, 'created_at', t.created_at,
        'deleted', t.deleted,
        'url', ('/tags/' || rtrim(encode(('Tag:' || t.id) ::bytea, 'base64'), '='))
      ) -- ORDER BY tag_articles DESC
      -- ORDER BY -- t.content = pg_temp.slug(t.content) DESC,
        -- tag_authors DESC NULLS LAST, tag_articles DESC NULLS LAST, at.span_days DESC NULLS LAST,
        -- t.created_at ASC
    )) AS dups,
    to_jsonb(ARRAY_AGG(DISTINCT to_jsonb(t.*) || jsonb_build_object('editors', t.editors ::int[]))) AS details,
    to_jsonb(ARRAY_AGG(DISTINCT to_jsonb(action_tag_stats.*)) FILTER (WHERE action_tag_stats.count IS NOT NULL) ) AS action_details
  FROM pg_temp.tag t
  LEFT JOIN (
    SELECT *
    FROM public.article_tag at
    JOIN article_tag_stats_by_id USING (tag_id)
  ) at ON t.id=at.tag_id
  LEFT JOIN action_tag_stats USING (tag_id)
  /* LEFT JOIN (
    SELECT tag_id, SUM(sum_read_time) FILTER(WHERE rank<=20) AS sum_read_time_top20_r2w FROM (
      SELECT at.tag_id, at.article_id, -- a.title,
        art.sum_read_time, rank() OVER (PARTITION BY at.tag_id ORDER BY art.sum_read_time DESC)
      FROM article_tag at JOIN article a ON at.article_id = a.id AND date(timezone('utc', a.created_at)) >= CURRENT_DATE - interval '14 day'
      JOIN public.article_read_time_materialized art USING(article_id)
    ) t
    WHERE rank<=20
    GROUP BY 1
  ) art USING (tag_id) */
  LEFT JOIN public.article a ON at.article_id=a.id AND a.state IN ('active')
  -- JOIN "user" u ON a.author_id=u.id
  -- LEFT JOIN public.asset ON asset.type = 'tagCover' AND t.cover=asset.id
  GROUP BY 1
;
-- CREATE INDEX IF NOT EXISTS temp_article_tag_stats_slug_index ON :schema.article_tag_stats(slug) ;
ALTER TABLE :schema.article_tag_stats ADD UNIQUE (slug) ;
COMMENT ON TABLE :schema.article_tag_stats IS :comment ;

-- STOP_ON_ERROR ;

\set old _old
DROP TABLE IF EXISTS :schema.:tablename:old ;
ALTER TABLE IF EXISTS :schema.:tablename RENAME TO :tablename:old ;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE) CREATE TABLE :schema.:tablename AS

WITH article_tag_stats_by_slug AS (
  SELECT slug, to_jsonb((ARRAY_AGG(jsonb_build_object(
        'month', month, 'month_last', month_last, 'num_articles', num_articles, 'num_authors', num_authors
      ) ORDER BY month DESC))[1:20]
    ) AS stats
  FROM (
    SELECT t.slug, date_trunc('month', at.created_at) ::date AS month,
      MAX(at.created_at) AS month_last,
      COUNT(DISTINCT article_id) ::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
    FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
    JOIN pg_temp.tag t ON tag_id=t.id
    -- WHERE at.created_at >= date_trunc('month', CURRENT_DATE - '18 months'::interval)
    GROUP BY 1, 2
  ) st
  GROUP BY 1
), article_tag_authors_by_slug AS (
  SELECT slug, to_jsonb((ARRAY_AGG(jsonb_build_object(
        'author_id', author_id, 'user_name', user_name, 'display_name', display_name,
        'last_use', last_use, 'num_articles', num_articles, 'last_5', last_5
      ) ORDER BY num_articles DESC, last_use DESC))[1:100]
    ) AS top_authors

  FROM (
    SELECT t.slug, author_id, -- date_trunc('month', at.created_at) ::date AS month,
      MAX(at.created_at) AS last_use,
      COUNT(DISTINCT article_id) ::int AS num_articles, -- , COUNT(*) ::int -- COUNT(DISTINCT author_id) ::int AS num_authors
      (ARRAY_AGG(concat(a.id) ORDER BY a.created_at DESC))[1:5] AS last_5
    FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
    JOIN pg_temp.tag t ON tag_id=t.id
    -- WHERE at.created_at >= date_trunc('month', CURRENT_DATE - '18 months'::interval)
    GROUP BY 1, 2
  ) st
  JOIN public."user" u ON author_id=u.id
  GROUP BY 1
), tag_read_time_by_slug AS (
  SELECT t.slug, SUM(sum_read_time) FILTER(WHERE rank<=20) ::int AS sum_read_time_top20_r2w FROM (
    SELECT t.slug, at.article_id, -- a.title,
      art.sum_read_time, rank() OVER (PARTITION BY t.slug ORDER BY art.sum_read_time DESC)
    FROM article_tag at JOIN article a ON at.article_id = a.id AND date(timezone('utc', a.created_at)) >= (CURRENT_DATE - '14 days'::interval)
    JOIN public.article_read_time_materialized art USING(article_id)
    JOIN pg_temp.tag t ON tag_id=t.id
  ) t
  WHERE rank<=20
  GROUP BY 1
), tag_slug_aliases AS (
SELECT slug,
    ARRAY_AGG(id_slug_orig
      ORDER BY is_major_tag DESC NULLS LAST, deleted ASC NULLS LAST, -- false<true<null
        -- content NOT SIMILAR TO '(#|＃)%' DESC,
        starts_with_hash ASC NULLS LAST, -- (starts_with(content, '#') || starts_with(content, '＃')) DESC,
        content_orig = pg_temp.slug(content_orig) DESC, num_authors DESC NULLS LAST, num_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC, id ASC) AS aliases,
    ARRAY_AGG(id
      ORDER BY is_major_tag DESC NULLS LAST, deleted ASC NULLS LAST, -- false<true<null
        -- content NOT SIMILAR TO '(#|＃)%' DESC,
        starts_with_hash ASC NULLS LAST, -- (starts_with(content, '#') || starts_with(content, '＃')) DESC,
        content_orig = pg_temp.slug(content_orig) DESC, num_authors DESC NULLS LAST, num_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC, id ASC) AS dup_tag_ids
  FROM (
    SELECT t.slug, t.id ::int, is_major_tag, t.content_orig, deleted, starts_with_hash,
      -- (starts_with(content, '#') OR starts_with(content, '＃')) AS starts_with_hash,
      concat(t.id, '-', pg_temp.slug(t.content_orig)) AS id_slug_orig,
      -- pg_temp.slug(t.content) AS slug_orig,
      COUNT(DISTINCT t.id) AS num_ids,
      -- ARRAY_AGG(t.id ::int) AS ids,
      COUNT(DISTINCT article_id) ::int AS num_articles,
      COUNT(DISTINCT author_id) ::int AS num_authors,
      MAX(at.created_at) ::date - MIN(at.created_at) ::date AS span_days,
      MIN(t.created_at) AS created_at
    FROM pg_temp.tag t
    LEFT JOIN public.article_tag at ON at.tag_id=t.id
    LEFT JOIN public.article a ON at.article_id=a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ) top
  GROUP BY 1
), tag_editors AS (
  SELECT slug,
    CASE WHEN COUNT(*)>1 THEN
      -- ARRAY(SELECT * FROM UNNEST(pg_temp.array_cat_agg(editors)) AS x(id) ORDER BY id=81 DESC NULLS LAST, id ASC)
			pg_temp.array_uniq_stable( ARRAY[81] || pg_temp.array_cat_agg(editors ::int[]))
    ELSE NULL END ::int[] AS merged_editors
  FROM pg_temp.tag
  GROUP BY 1
), tag_covers AS (
  -- SELECT t.id, asset.path AS cover
  -- FROM (
    SELECT id, COALESCE(t.cover,
      (SELECT avn.cover
        FROM public.article_tag at
        LEFT JOIN public.article ON at.article_id=article.id AND article.state IN ('active') -- NOT IN ('archived', 'banned')
        LEFT JOIN public.article_version_newest avn ON at.article_id=avn.article_id
        WHERE at.tag_id = t.id AND avn.cover IS NOT NULL
        ORDER BY at.id ASC
        LIMIT 1 -- find the earliest one article with cover, re-use as tagCover
      )
    ) ::int AS cover
    FROM pg_temp.tag t
  -- ) t
  -- LEFT JOIN public.asset ON t.cover=asset.id -- asset.type='tagCover' AND
)


SELECT DISTINCT ON (id_slug) -- * -- EXCEPT(same_as_slug, tag_articles, tag_authors)
  id_slug, id, content, slug, /* same_as_slug, is_major_tag, major_tag_id, */ dup_tag_ids,
  num_articles, num_authors, num_articles_r3m, num_authors_r3m, num_articles_r1m, num_authors_r1m, num_articles_r2w, num_authors_r2w, num_articles_r1w, num_authors_r1w,
  sum_read_time_top20_r2w, span_days,
  earliest_use, latest_use, description, created_at, updated_at,
  creator, owner, editors, merged_editors, deleted, cover, -- tag_articles, tag_authors,
  top_rels, top_authors, dups, details, action_details, stats_series
FROM (
  SELECT COALESCE(aliases[1], (t.id || '-' || t.slug)) AS id_slug,
    -- t.id || '-' || t.slug AS id_slug_orig,
    t.id ::int, t.content_orig AS content, t.slug, t.starts_with_hash, t.same_as_slug, --  t.content_orig = pg_temp.slug(t.content_orig) AS same_as_slug, -- t.slug, -- COALESCE(major_tag_id, t.id) ::int AS major_tag_id,
    -- t.major_tag_id = t.id AS
    is_major_tag,
    dup_tag_ids[1] ::int AS major_tag_id, dup_tag_ids ::int[],
    -- at2.*, -- to_jsonb(at2.*) - '{slug,last_5,recent_users,dups}'::text[] AS article_tag_stats,
    COALESCE(num_articles, 0) ::int AS num_articles, COALESCE(num_authors, 0) ::int AS num_authors,
    num_articles_r3m, num_authors_r3m, num_articles_r1m, num_authors_r1m, num_articles_r2w, num_authors_r2w, num_articles_r1w, num_authors_r1w,
    artst.sum_read_time_top20_r2w,
    COALESCE(at2.span_days, 0) ::int AS span_days,
    earliest_use, latest_use, -- from at2.*
    /* at2.num_articles, at2.num_authors, at2.num_articles_m3a, at2.num_authors_m3a,
    at2.num_articles_m1a, at2.num_authors_m1a, at2.num_articles_w1a, at2.num_authors_w1a,
    at2.span_days, -- at2.earliest, at2.latest, t.created_at ::date AS tag_created, */
    -- atat.top_authors,
    -- to_jsonb(at2.*) - '{num_articles,num_authors,num_articles_m3a,num_authors_m3a,num_articles_m1a,num_authors_m1a,num_articles_w1a,num_authors_w1a}'::text[] AS more,
    -- at2.users_w3m, at2.last_5, at2.time_range, at2.dups, at2.details,
    -- at2.action_details, -- at2.*,
    t.description, t.created_at, t.updated_at, t.creator ::int, t.owner ::int, t.editors ::int[] AS editors, merged_editors, t.deleted,
    -- CASE WHEN t.cover IS NOT NULL THEN 'https://assets.matters.news/' || asset.path ELSE NULL END AS cover,
    -- CASE WHEN t.cover IS NOT NULL THEN :assets_prefix || asset.path ELSE NULL END AS cover,
    tag_covers.cover ::int, -- asset.path AS cover,
    COALESCE(tag_articles, 0) ::int AS tag_articles,
    COALESCE(tag_authors, 0) ::int AS tag_authors,
    -- to_jsonb(t.*) || jsonb_build_object( 'editors', t.editors ::int[]) AS detail,

    tag_rels.top_rels,
    atat.top_authors,

    to_jsonb(ARRAY(
      SELECT x FROM jsonb_array_elements(dups) x
      ORDER BY x->'deleted' ASC, x->'is_major_tag' DESC, x->'starts_with_hash' ASC, x->'same_as_slug' DESC,
        x->'tag_authors' DESC, x->'tag_articles' DESC, x->'span_days' DESC, (x->>'created_at')::timestamptz ASC, x->'id' ASC
    )) AS dups,
    /* to_jsonb(ARRAY(
      SELECT x FROM jsonb_array_elements(details) x
    )) AS */ details,
    action_details, atst.stats AS stats_series
  FROM pg_temp.tag t
  LEFT JOIN pg_temp.article_tag_stats_by_id tag_stats ON tag_stats.tag_id=t.id
  LEFT JOIN pg_temp.article_tag_rels_by_id tag_rels ON tag_rels.tag_id=t.id
  LEFT JOIN :schema.article_tag_stats at2 USING (slug)
  LEFT JOIN article_tag_stats_by_slug atst USING (slug)
  LEFT JOIN article_tag_authors_by_slug atat USING (slug)
  LEFT JOIN tag_read_time_by_slug artst USING (slug)
  LEFT JOIN tag_slug_aliases USING (slug)
  LEFT JOIN tag_editors USING (slug)
  -- LEFT JOIN public.asset ON asset.type='tagCover' AND t.cover=asset.id
  LEFT JOIN tag_covers USING(id)
) t
ORDER BY id_slug,
  deleted ASC NULLS LAST,
  is_major_tag DESC NULLS LAST,
  starts_with_hash ASC NULLS LAST,
  same_as_slug DESC, tag_authors DESC NULLS LAST, tag_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC
;

ALTER TABLE :schema.:tablename
  ADD PRIMARY KEY (id),
  ALTER COLUMN id_slug SET NOT NULL,
  ADD UNIQUE (id_slug),
  ALTER COLUMN content SET NOT NULL,
  ADD UNIQUE (content),
  ALTER COLUMN slug SET NOT NULL,
  ADD UNIQUE (slug)
  ;

\set _dup_tag_ids_index _dup_tag_ids_index
DROP INDEX IF EXISTS :tablename:_dup_tag_ids_index ;
CREATE INDEX IF NOT EXISTS :tablename:_dup_tag_ids_index ON :schema.:tablename USING gin(dup_tag_ids) ;

-- the number of records should equal to
SELECT COUNT(*), COUNT(DISTINCT content) FROM public.tag ;
SELECT COUNT(*), COUNT(DISTINCT content_orig), COUNT(DISTINCT slug) FROM pg_temp.tag ;
SELECT COUNT(*), SUM(array_length(dup_tag_ids, 1)) FROM :schema.:tablename ;

DROP VIEW IF EXISTS :schema.tags_lasts ;
CREATE OR REPLACE VIEW :schema.tags_lasts AS SELECT * FROM :schema.:tablename ;

COMMENT ON TABLE :schema.:tablename IS :comment ;
COMMENT ON VIEW :schema.tags_lasts IS :comment ;
