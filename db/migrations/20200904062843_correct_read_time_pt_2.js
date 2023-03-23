/**
 * Fix read records that created in the middle of deployment
 * of fixing wrong read_time in article_read_count.
 */

export const up = async (knex) => {
  await knex.raw(`
    UPDATE
        article_read_count
    SET
        read_time = ROUND(read_time::NUMERIC/1000)
    FROM (
        SELECT
            base.*
        FROM (
            SELECT
                id,
                updated_at,
                read_time / COALESCE(NULLIF(timed_count, 0), 1) AS avg_time
            FROM
                article_read_count
        ) AS base
        WHERE
            base.updated_at >= '2020-07-31 12:30:00'
            AND base.avg_time > 1800
    ) AS source
    WHERE article_read_count.id = source.id
  `)
}

export const down = async (knex) => {}
