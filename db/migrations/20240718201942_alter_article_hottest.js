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
  // lower the threshold of donation amount: HKD 5 -> 1, USDT 0.5 -> 0.1
  // DDL belowed derived from db/migrations/20240130120001_alter_article_hottest.js

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
  SELECT max(read_time_efficiency_boost) AS max_efficiency FROM
  (
      SELECT
      a.id,
      CASE WHEN extract(epoch FROM now()-a.created_at) <= ${boost_window}*3600 THEN ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
           WHEN ac.article_id IS NOT NULL AND extract(epoch from now()-a.created_at) < 24*3600 THEN ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(EPOCH FROM NOW()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
           ELSE (sum(arc.read_time)::decimal/least(extract(EPOCH FROM now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 END AS read_time_efficiency_boost
      FROM article a
      JOIN public.user u ON a.author_id = u.id
      JOIN article_read_count arc ON a.id = arc.article_id
      LEFT JOIN article_circle ac ON ac.article_id = a.id
      WHERE a.state = 'active'
      AND arc.created_at >= to_timestamp((extract(EPOCH FROM now()) - ${time_window}*24*3600))
      AND arc.user_id IS NOT NULL
      AND a.id NOT IN (SELECT entrance_id FROM article_connection WHERE article_id = 8079 )
      GROUP BY a.id, ac.article_id, ac.created_at
  ) t
), tag_boost_rank AS (
  SELECT *, percent_rank() OVER(ORDER BY boost)
  FROM tag_boost
  WHERE created_at >= '2023-12-01'
)

  SELECT article.id, article.created_at, 'https://matters.town/a/' || article.short_hash AS link,
    (COALESCE(clamp(tag_boost_eff, 0.5, 2), 1.0) * COALESCE(t.score, 0)) AS score,
    tag_boost_eff,    -- adjust boost_eff in range [0.5, 2]
    COALESCE(t.score, 0) as score_prev  -- save the previous score without tag boost for comparison
  FROM article
  LEFT JOIN
  (
      SELECT
      CASE WHEN ac.id IS NOT NULL THEN 1 ELSE 0 END AS is_from_circle,
      t1.*,
      t2.latest_transaction, t3.latest_transaction_matty, t2.count_normal_transaction,
      (SELECT max_efficiency FROM original_score) AS max_efficiency,
      greatest(
          (SELECT max_efficiency FROM original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(EPOCH FROM now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (SELECT max_efficiency FROM original_score)*coalesce(${matty_donation_decay_factor}^(extract(EPOCH FROM now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) as donation_score,
      t1.read_time_efficiency_boost + greatest(
          (SELECT max_efficiency FROM original_score)*coalesce((${donation_decay_factor}^coalesce(t2.count_normal_transaction, 1))^(extract(EPOCH FROM now()-t2.latest_transaction)/3600) ::numeric(6,0), 0),
          (SELECT max_efficiency FROM original_score)*coalesce(${matty_donation_decay_factor}^(extract(EPOCH FROM now()-t3.latest_transaction_matty)/3600) ::numeric(6,0), 0)
      ) AS score,
      tag_boost_eff
      FROM
      (
          SELECT
          a.id,
          a.created_at,
          u.display_name,
          sum(arc.read_time) AS read_seconds_in_time_window,
          (sum(arc.read_time)::decimal/least(extract(EPOCH FROM now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 AS read_time_efficiency,
          CASE WHEN extract(EPOCH FROM now()-a.created_at) <= ${boost_window}*3600 then ${boost}*(sum(arc.read_time)::decimal/least(extract(epoch from now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               WHEN ac.article_id IS NOT NULL AND extract(EPOCH FROM now()-ac.created_at) < 24*3600 THEN ${circle_boost}*(sum(arc.read_time)::decimal/least(extract(EPOCH FROM now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5
               ELSE (sum(arc.read_time)::decimal/least(extract(EPOCH FROM now()-a.created_at)::decimal + 1, ${time_window}*24*3600))^0.5 END AS read_time_efficiency_boost
          FROM article a
          JOIN public.user u ON a.author_id = u.id
          JOIN article_read_count arc ON a.id = arc.article_id
          LEFT JOIN article_circle ac ON ac.article_id = a.id
          WHERE a.state = 'active'
          AND arc.created_at > to_timestamp((extract(EPOCH FROM now()) - ${time_window}*24*3600))
          AND arc.user_id IS NOT NULL
          GROUP BY a.id, ac.article_id, ac.created_at, u.display_name
      ) t1
      LEFT JOIN
      (
           SELECT target_id, max(updated_at) AS latest_transaction, count(1) AS count_normal_transaction
           FROM transaction
           WHERE target_type = 4 AND state = 'succeeded' AND purpose = 'donation'
           AND ((currency = 'HKD' AND amount >= 1) OR (currency = 'USDT' AND amount >= 0.1))
           AND sender_id NOT IN (81, 6, 11, 89281, 93960)
           GROUP BY target_id
      ) t2 ON t1.id = t2.target_id
      LEFT JOIN
      (
           SELECT target_id,
             max(updated_at) FILTER(WHERE sender_id IN (81, 6, 11, 89281, 93960)) AS latest_transaction_matty
           FROM transaction
           WHERE target_type = 4 AND state = 'succeeded' AND purpose = 'donation'
           GROUP BY target_id
      ) t3 on t1.id = t3.target_id -- Matty boost
      LEFT JOIN (
        SELECT article_id,
          MAX(percent_rank) AS max_tag_boost, MIN(percent_rank) AS min_tag_boost,
          -- AVG(percent_rank)*2.0-1 AS tag_boost_eff -- in the range of [-1.0, 1.0)
          mul(boost) AS tag_boost_eff
        FROM article_tag JOIN tag_boost_rank USING(tag_id)
        GROUP BY article_id
      ) t4 ON t4.article_id=t1.id

      LEFT JOIN article_circle ac ON t1.id = ac.article_id
      WHERE t1.id not in (SELECT entrance_id FROM article_connection WHERE article_id = 8079 ) --to block all articles in the Complaint Area
  ) t ON article.id = t.id
  WHERE article.state = 'active'
  ORDER BY score DESC, created_at DESC;

  CREATE MATERIALIZED VIEW ${materialized} as
  SELECT *
  FROM ${view};

  CREATE UNIQUE INDEX ${materialized}_id ON public.${materialized} (id);
  CREATE INDEX ${index} ON ${materialized}(score DESC NULLS LAST);
  `)
}

exports.down = function (knex) {
  knex.raw(/*sql*/ `
  drop view ${view} cascade;
  `)
}
