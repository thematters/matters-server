/**
 * This migration script is for generating curation tags ID list.
 *
 */
const view = 'curation_tag_materialized'

export const up = async (knex) => {
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (!matty) {
    return
  }

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
            base.articles >= 3
            AND (tag.description IS NOT NULL OR base.selected > 0)
    ) AS source
    ORDER BY uuid
  `)
}

export const down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${view}`)
}
