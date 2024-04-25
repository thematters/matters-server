const view = `article_hottest_view`
const materialized = `article_hottest_materialized`
const index = 'article_hottest_materialized_score_index'

const time_window = 3
const donation_decay_factor = 0.5
const boost = 1
const boost_window = 3
const matty_donation_decay_factor = 0.95
const circle_boost = 2

exports.up = async (knex) => {
  // remove dependency on `article.title` and `article.media_hash` and create index
  // DDL belowed derived from 20231221080000_update_hottest_feed-tag-boost.js

  await knex.raw(/*sql*/ `
CREATE OR REPLACE AGGREGATE mul(real) ( SFUNC = float4mul, STYPE=real );
-- or the generic version: CREATE OR REPLACE FUNCTION mul(anyelement, anyelement) RETURNS anyelement LANGUAGE sql AS 'SELECT $1 * coalesce($2, 1)' ;

-- example: clamp(subject, min, max)
CREATE OR REPLACE FUNCTION clamp(real, real, real) RETURNS real
AS 'SELECT GREATEST($2, LEAST($3, $1));'
LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

DROP VIEW IF EXISTS ${view} CASCADE;

CREATE VIEW ${view} AS
WITH original_score AS (
  select max(read_time_efficiency_boost) as max_efficiency from
  (
      select
      a.id,
      case when extract(epoch from now()-a.created_at) <= ${boost_window}*3600 then ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
           when ac.article_id is not null and extract(epoch from now()-a.created_at) < 24*3600 then ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
           else (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 end as read_time_efficiency_boost
      from article a
      join public.user u on a.author_id = u.id
      join article_read_count arc on a.id = arc.article_id
      left join article_circle ac on ac.article_id = a.id
      where a.state = 'active'
      and arc.created_at >= to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
      and arc.user_id is not null
      and a.id not in (select entrance_id from article_connection where article_id = 8079 )
      group by a.id, ac.article_id, ac.created_at
  ) t
), tag_boost_rank AS (
  SELECT *, percent_rank() OVER(ORDER BY boost)
  FROM tag_boost
  WHERE created_at >= '2023-12-01'
)

  select article.id, article.created_at, 'https://matters.town/@-/' || article.id as link,
    (COALESCE(clamp(tag_boost_eff, 0.5, 2), 1.0) * COALESCE(t.score, 0)) AS score,
    tag_boost_eff,    -- adjust boost_eff in range [0.5, 2]
    COALESCE(t.score, 0) as score_prev  -- save the previous score without tag boost for comparison
  from article
  left join
  (
      select
      case when ac.id is not null then 1 else 0 end as is_from_circle,
      t1.*,
      t2.latest_transaction, t3.latest_transaction_matty, t2.count_normal_transaction,
      (select max_efficiency from original_score) as max_efficiency,
      greatest(
          (select max_efficiency from original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(epoch from now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (select max_efficiency from original_score)*coalesce(${matty_donation_decay_factor}^(extract(epoch from now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) as donation_score,
      t1.read_time_efficiency_boost + greatest(
          (select max_efficiency from original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(epoch from now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (select max_efficiency from original_score)*coalesce(${matty_donation_decay_factor}^(extract(epoch from now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) as score,
      tag_boost_eff
      from
      (
          select
          a.id,
          a.created_at,
          u.display_name,
          'https://matters.town/@-/' || a.id as link,
          sum(arc.read_time) as read_seconds_in_time_window,
          (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 as read_time_efficiency,
          case when extract(epoch from now()-a.created_at) <= ${boost_window}*3600 then ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               when ac.article_id is not null and extract(epoch from now()-ac.created_at) < 24*3600 then ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               else (sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 end as read_time_efficiency_boost
          from article a
          join public.user u on a.author_id = u.id
          join article_read_count arc on a.id = arc.article_id
          left join article_circle ac on ac.article_id = a.id
          where a.state = 'active'
          and arc.created_at > to_timestamp((extract(epoch from now()) - ${time_window}*24*3600))
          and arc.user_id is not null
          group by a.id, ac.article_id, ac.created_at, u.display_name
      ) t1
      left join
      (
           select target_id, max(updated_at) as latest_transaction, count(1) as count_normal_transaction
           from transaction
           where target_type = 4 and state = 'succeeded' and purpose = 'donation'
           -- and (currency = 'LIKE' and amount >= 100 or currency = 'HKD')
           -- and sender_id = 0
           and ((currency = 'HKD' and amount >= 5) or (currency = 'USDT' and amount >= 0.5))
           and sender_id not in (81, 6, 11, 89281, 93960)
           group by target_id
      ) t2 on t1.id = t2.target_id
      left join
      (
           select target_id,
             max(updated_at) FILTER(WHERE sender_id IN (81, 6, 11, 89281, 93960)) AS latest_transaction_matty
           from transaction
           where target_type = 4 and state = 'succeeded' and purpose = 'donation'
           group by target_id
      ) t3 on t1.id = t3.target_id -- Matty boost
      LEFT JOIN (
        SELECT article_id,
          MAX(percent_rank) AS max_tag_boost, MIN(percent_rank) AS min_tag_boost,
          -- AVG(percent_rank)*2.0-1 AS tag_boost_eff -- in the range of [-1.0, 1.0)
          mul(boost) AS tag_boost_eff
        FROM article_tag JOIN tag_boost_rank USING(tag_id)
        GROUP BY article_id
      ) t4 ON t4.article_id=t1.id

      left join article_circle ac on t1.id = ac.article_id
      where t1.id not in (select entrance_id from article_connection where article_id = 8079 ) --to block all articles in the Complaint Area
  ) t on article.id = t.id
  where article.state = 'active'
  order by score desc, created_at desc;

  create materialized view ${materialized} as
  select *
  from ${view};

  CREATE UNIQUE INDEX ${materialized}_id ON public.${materialized} (id);
  CREATE INDEX ${index} ON ${materialized}(score DESC NULLS LAST);
  `)
}

exports.down = function (knex) {
  knex.raw(/*sql*/ `
  drop view ${view} cascade;
  `)
}
