// coverted from
// https://github.com/thematters/matters-metabase/blob/main/sql/stale-tags-create-table-view.sql
// from AnalysisDB's regular daily view format to materialized view;

const schema = 'mat_views'
const materialized_view_name = 'tags_lasts_view_materialized'

exports.up = async (knex) => {
  await knex.raw(/*sql*/ `
CREATE SCHEMA IF NOT EXISTS "${schema}" ;

CREATE OR REPLACE FUNCTION "${schema}".slug(input text) RETURNS text AS $f$
  SELECT COALESCE(
    NULLIF(trim(both '-' from regexp_replace(input, '\\W+', '-', 'g')), ''),
    -- NULLIF(trim(both '-' from regexp_replace(input, '[()（）@''’"<>,.?;&＆!│｜|/#＃、，．…：；「」《》？！\\\\+—\\-ㅤ\\s]+', '-', 'g')), ''),
    NULLIF(trim(both '-' from regexp_replace(input, '\\s+', '-', 'g')), ''),
    input
  )
$f$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION "${schema}".is_conforming_tag(input text) RETURNS boolean AS $f$
  SELECT length(input)<=40 AND input ~ '^\\w+$' -- regular expression match
$f$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;


DROP MATERIALIZED VIEW IF EXISTS "${schema}"."${materialized_view_name}" CASCADE;

CREATE MATERIALIZED VIEW "${schema}"."${materialized_view_name}" AS

WITH temp_tag AS (
  SELECT id, created_at, updated_at, remark, deleted, starts_with_hash, same_as_slug, cover, description, editors, creator, owner, major_tag_id, is_major_tag, is_conforming_tag,
    content_orig, COALESCE(slug, "${schema}".slug(lower(content))) AS slug
  FROM (
    SELECT id ::int, created_at, updated_at, remark, deleted, cover, description, editors ::int[], creator, owner, id ::int AS major_tag_id,
      /* (major_tag_id IS NULL OR major_tag_id=id) */ NULL AS is_major_tag, NULL AS slug,
      "${schema}".is_conforming_tag(content),
      content AS content_orig,
      (starts_with(content, '#') OR starts_with(content, '＃')) AS starts_with_hash,
      (content = "${schema}".slug(content)) AS same_as_slug,
      content -- use t2.content alias
    FROM public.tag t1
  ) t1
), temp_article_tag_stats_by_id AS (
  SELECT tag_id ::int,
    COUNT(DISTINCT article_id) ::int AS tag_articles, COUNT(DISTINCT author_id) ::int AS tag_authors,
    (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days
  FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
  GROUP BY 1
), temp_tag_uses AS (
  SELECT tag_id ::int, ARRAY_AGG(DISTINCT article_id) AS article_ids, COUNT(DISTINCT article_id) ::int
  -- FROM article_tag
  FROM public.article_tag at JOIN public.article a ON article_id=a.id AND a.state IN ('active')
  GROUP BY 1
  HAVING COUNT(article_id)>0
), temp_tag_common_count AS (
  SELECT t.tag_id, tag_rel_id, count_common,
    tu1.count AS count_target, tu2.count AS count_rel,
    (tu1.count + tu2.count - count_common) AS count_union, temp_tag.is_conforming_tag
  FROM (
    SELECT tu.tag_id ::int, at.tag_id ::int AS tag_rel_id, COUNT(*) ::int AS count_common
    FROM temp_tag_uses tu
    JOIN article_tag at ON at.article_id =ANY(tu.article_ids) AND (at.tag_id <> tu.tag_id)
    GROUP BY 1, 2
  ) t
  JOIN temp_tag_uses tu1 ON tu1.tag_id=t.tag_id
  JOIN temp_tag_uses tu2 ON tu2.tag_id=t.tag_rel_id
  LEFT JOIN temp_tag ON tu2.tag_id=temp_tag.id -- WHERE tag.is_conforming_tag
), temp_tag_similarity AS (
  SELECT *, -- (count1+count2-count_common) AS count_union,
    ROUND(count_common ::numeric / count_union, 5) AS similarity,
    ROUND((count_common ::numeric / count_target + count_common ::numeric / count_rel)/2, 5) AS diff_similarity,
    -- ROUND(count_common ::numeric / count_union * count_rel, 5) AS sim_to_target,
    rank() OVER(PARTITION BY tag_id ORDER BY
      (count_common ::numeric * count_rel / count_union) DESC, -- count_rel * similarity DESC
      (count_common ::numeric / count_union) DESC, count_common DESC) -- FILTER (WHERE is_conforming_tag)
  FROM temp_tag_common_count t
), temp_article_tag_rels_by_id AS (
  SELECT tag_id, to_jsonb((ARRAY_AGG(
      (to_jsonb(ts.*) - '{rank,tag_id,count_target,is_conforming_tag}'::text[] -- || jsonb_build_object('tag_content', temp_tag.content)
      ) ORDER BY rank ASC) FILTER (WHERE is_conforming_tag)
    )[1:100]) AS top_rels
  FROM temp_tag_similarity ts
  -- JOIN temp_tag ON ts.tag_rel_id=temp_tag.id
  WHERE ts.is_conforming_tag AND
    rank<=130 -- extract only first 100 from
  GROUP BY 1
), action_tag_stats AS (
  SELECT target_id AS tag_id, action, COUNT(*) ::int AS count,
    COUNT(DISTINCT user_id) ::int AS num_users,
    MIN(created_at) AS earliest,
    MAX(created_at) AS latest,
    -- MAX(created_at) ::date - MIN(created_at) ::date AS span_days
    (MAX(created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(created_at) ::date AS span_days
  FROM public.action_tag
  GROUP BY 1, 2
), article_tag_stats AS (
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
    (MAX(at.created_at) + '1 day'::interval - '1 microsecond'::interval) ::date - MIN(at.created_at) ::date AS span_days,
    MIN(at.created_at) AS earliest_use,
    MAX(at.created_at) AS latest_use,
    to_jsonb(ARRAY_AGG(DISTINCT jsonb_build_object(
        'id', t.id, 'tag', t.content_orig, 'id_slug', (t.id || '-' || t.slug),
        'tag_articles', tag_articles, 'tag_authors', tag_authors,
        'same_as_slug', t.same_as_slug, -- t.content_orig = pg_temp.slug(t.content_orig),
        'starts_with_hash', t.starts_with_hash, -- (starts_with(content, '#') OR starts_with(content, '＃')),
        -- 'is_major_tag', t.is_major_tag, -- t.major_tag_id=t.id,
        'is_conforming_tag', t.is_conforming_tag,
        'span_days', at.span_days, 'created_at', t.created_at,
        'deleted', t.deleted,
        'url', ('/tags/' || rtrim(encode(('Tag:' || t.id) ::bytea, 'base64'), '='))
      ) -- ORDER BY tag_articles DESC
    )) AS dups,
    -- to_jsonb(ARRAY_AGG(DISTINCT to_jsonb(t.*) || jsonb_build_object('editors', t.editors ::int[]))) AS details,
    to_jsonb(ARRAY_AGG(DISTINCT to_jsonb(action_tag_stats.*)) FILTER (WHERE action_tag_stats.count IS NOT NULL) ) AS action_details
  FROM temp_tag t
  LEFT JOIN (
    SELECT *
    FROM public.article_tag at
    JOIN temp_article_tag_stats_by_id USING (tag_id)
  ) at ON t.id=at.tag_id
  LEFT JOIN action_tag_stats USING (tag_id)
  LEFT JOIN public.article a ON at.article_id=a.id AND a.state IN ('active')
  GROUP BY 1
), tag_slug_aliases AS (
  SELECT slug,
    ARRAY_AGG(id_slug_orig
      ORDER BY is_major_tag DESC NULLS LAST, deleted ASC NULLS LAST, -- false<true<null
        -- content NOT SIMILAR TO '(#|＃)%' DESC,
        starts_with_hash ASC NULLS LAST, -- (starts_with(content, '#') || starts_with(content, '＃')) DESC,
        content_orig = "${schema}".slug(content_orig) DESC, num_authors DESC NULLS LAST, num_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC, id ASC) AS aliases,
    ARRAY_AGG(id
      ORDER BY is_major_tag DESC NULLS LAST, deleted ASC NULLS LAST, -- false<true<null
        -- content NOT SIMILAR TO '(#|＃)%' DESC,
        starts_with_hash ASC NULLS LAST, -- (starts_with(content, '#') || starts_with(content, '＃')) DESC,
        content_orig = "${schema}".slug(content_orig) DESC, num_authors DESC NULLS LAST, num_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC, id ASC) AS dup_tag_ids
  FROM (
    SELECT t.slug, t.id ::int, is_major_tag, t.content_orig, deleted, starts_with_hash,
      concat(t.id, '-', "${schema}".slug(t.content_orig)) AS id_slug_orig,
      COUNT(DISTINCT t.id) AS num_ids,
      COUNT(DISTINCT article_id) ::int AS num_articles,
      COUNT(DISTINCT author_id) ::int AS num_authors,
      MAX(at.created_at) ::date - MIN(at.created_at) ::date AS span_days,
      MIN(t.created_at) AS created_at
    FROM temp_tag t
    LEFT JOIN public.article_tag at ON at.tag_id=t.id
    LEFT JOIN public.article a ON at.article_id=a.id AND a.state IN ('active') -- NOT IN ('archived', 'banned')
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ) top
  GROUP BY 1
)

SELECT DISTINCT ON (id_slug)
  id_slug, id, content, slug, /* same_as_slug, is_major_tag, major_tag_id, */ dup_tag_ids,
  num_articles, num_authors, num_articles_r3m, num_authors_r3m, num_articles_r1m, num_authors_r1m, num_articles_r2w, num_authors_r2w, num_articles_r1w, num_authors_r1w, -- sum_read_time_top20_r2w,
  span_days,
  earliest_use, latest_use, description, created_at, updated_at,
  creator, owner, editors, -- merged_editors, deleted, -- cover, -- tag_articles, tag_authors,
  top_rels, dups, action_details -- , stats_series
FROM (
  SELECT COALESCE(aliases[1], (t.id || '-' || t.slug)) AS id_slug,
    t.id ::int, t.content_orig AS content, t.slug, t.starts_with_hash, t.same_as_slug, --  t.content_orig = pg_temp.slug(t.content_orig) AS same_as_slug, -- t.slug, -- COALESCE(major_tag_id, t.id) ::int AS major_tag_id,
    is_major_tag, is_conforming_tag,
    dup_tag_ids[1] ::int AS major_tag_id, dup_tag_ids ::int[],
    COALESCE(num_articles, 0) ::int AS num_articles, COALESCE(num_authors, 0) ::int AS num_authors,
    num_articles_r3m, num_authors_r3m, num_articles_r1m, num_authors_r1m, num_articles_r2w, num_authors_r2w, num_articles_r1w, num_authors_r1w,
    COALESCE(at2.span_days, 0) ::int AS span_days,
    earliest_use, latest_use, -- from at2.*
    t.description, t.created_at, t.updated_at, t.creator ::int, t.owner ::int, t.editors ::int[] AS editors, t.deleted,
    COALESCE(tag_articles, 0) ::int AS tag_articles,
    COALESCE(tag_authors, 0) ::int AS tag_authors,

    tag_rels.top_rels, -- atat.top_authors,

    to_jsonb(ARRAY(
      SELECT x FROM jsonb_array_elements(dups) x
      ORDER BY x->'deleted' ASC, x->'is_major_tag' DESC, x->'is_conforming_tag' DESC, x->'starts_with_hash' ASC, x->'same_as_slug' DESC,
        x->'tag_authors' DESC, x->'tag_articles' DESC, x->'span_days' DESC, (x->>'created_at')::timestamptz ASC, x->'id' ASC
    )) AS dups, action_details
  FROM temp_tag t
  LEFT JOIN temp_article_tag_stats_by_id tag_stats ON tag_stats.tag_id=t.id
  LEFT JOIN temp_article_tag_rels_by_id tag_rels ON tag_rels.tag_id=t.id
  LEFT JOIN article_tag_stats at2 USING (slug)
  -- LEFT JOIN article_tag_stats_by_slug atst USING (slug)
  -- LEFT JOIN article_tag_authors_by_slug atat USING (slug)
  -- LEFT JOIN tag_read_time_by_slug artst USING (slug)
  LEFT JOIN tag_slug_aliases USING (slug)
) t1
ORDER BY id_slug,
  deleted ASC NULLS FIRST,
  is_major_tag DESC NULLS LAST,
  is_conforming_tag DESC NULLS LAST,
  starts_with_hash ASC NULLS LAST,
  same_as_slug DESC, tag_authors DESC NULLS LAST, tag_articles DESC NULLS LAST, span_days DESC NULLS LAST, created_at ASC
;

CREATE UNIQUE INDEX ON "${schema}"."${materialized_view_name}" (id) ;
CREATE UNIQUE INDEX ON "${schema}"."${materialized_view_name}" (id_slug) ;
CREATE UNIQUE INDEX ON "${schema}"."${materialized_view_name}" (content) ;
CREATE UNIQUE INDEX ON "${schema}"."${materialized_view_name}" (slug) ;

DROP INDEX IF EXISTS "${schema}"."${materialized_view_name}_dup_tag_ids_idx" ;
CREATE INDEX "${materialized_view_name}_dup_tag_ids_idx" ON "${schema}"."${materialized_view_name}" USING gin(dup_tag_ids) ;

`)
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW IF EXISTS "${schema}"."${materialized_view_name}" CASCADE;`
  )
}
