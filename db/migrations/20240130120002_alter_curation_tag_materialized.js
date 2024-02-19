/**
 * This migration script is for generating curation tags ID list.
 *
 */
const view = 'curation_tag_materialized'

exports.up = async (knex) => {
  // remove dependency on article.title
  // DDL belowed derived from 20220420023434_update_curation_tag_materialized.js

  // drop current materialized view
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${view}`)

  // recreate new materialized view
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${view} AS
    SELECT t.id, RANDOM() AS uuid, SUM(t1.sum_read_time) AS sum_read_time_top_n
    FROM tag t JOIN
      (
          SELECT at.tag_id, at.article_id, art.sum_read_time, rank() over (partition by at.tag_id order by art.sum_read_time desc)
          FROM article_tag at JOIN article a ON at.article_id = a.id AND a.created_at > now() - Interval '14 day'
          JOIN article_read_time_materialized art ON at.article_id = art.article_id
      ) t1 ON t.id = t1.tag_id
    WHERE t1.rank <= 20
      AND t.description IS NOT NULL
      AND t.deleted = FALSE
    GROUP BY t.id
    ORDER BY sum_read_time_top_n DESC;

    CREATE UNIQUE INDEX ${view}_id on public.${view} (id);
  `)
}

exports.down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${view}`)
}
