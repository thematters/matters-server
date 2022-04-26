/**
 * This migration script is for generating curation tags ID list.
 *
 */
const view = 'curation_tag_materialized'

exports.up = async (knex) => {
  // drop current materialized view
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${view}`)

  // recreate new materialized view
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${view} AS
    SELECT t.id, RANDOM() AS uuid, SUM(t1.sum_read_time) AS sum_read_time_top_n
    FROM tag t JOIN
      (
          SELECT at.tag_id, at.article_id, a.title, art.sum_read_time, rank() over (partition by at.tag_id order by art.sum_read_time desc)
          FROM article_tag at JOIN article a ON at.article_id = a.id AND a.created_at > now() - Interval '14 day'
          JOIN article_read_time_materialized art ON at.article_id = art.article_id
      ) t1 ON t.id = t1.tag_id
    WHERE t1.rank <= 20
      AND t.description IS NOT NULL
      AND t.deleted = FALSE
    GROUP BY t.id
    ORDER BY sum_read_time_top_n DESC
  `)
}

exports.down = async (knex) => {
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (!matty) {
    return
  }

  // drop current materialized view
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${view}`)

  // recreate previous version of materialized view
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${view} AS
    SELECT
        source.id,
        RANDOM() AS uuid
    FROM (
        SELECT
            tag.*
        FROM (
            SELECT
                tag.id,
                COUNT(1) AS articles,
                COALESCE(SUM(art.selected::int), 0) AS selected
            FROM
                tag
                JOIN article_tag art ON art.tag_id = tag.id
            WHERE
                tag.deleted = FALSE
                AND tag.owner != ${matty.id}
                OR (tag.owner = ${matty.id} AND now() - tag.created_at <= Interval '90 day')
            GROUP BY
                tag.id
        ) AS base
        JOIN tag ON tag.id = base.id
        WHERE
            base.articles >= 5
            AND tag.description IS NOT NULL
    ) AS source
    ORDER BY uuid
  `)
}
