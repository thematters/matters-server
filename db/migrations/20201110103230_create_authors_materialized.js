/**
 * This migration script is for generating author related views.
 *
 */
const activeView = 'most_active_author_materialized'
const appreciatedView = 'most_appreciated_author_materialized'
const trendyView = 'most_trendy_author_materialized'

exports.up = async (knex) => {
  // create most active author materialized
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${activeView} AS
    SELECT
      *
    FROM (
    ) AS source
  `)

  // create most appreciated author materialized
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${appreciatedView} AS
    SELECT
      recipient_id,
      SUM(amout) AS sum
    FROM
      "transaction"
    WHERE
      currency = 'HKD'
      AND purpose = 'donation'
      AND state = 'succeeded'
    GROUP BY
      recipient_id
    ORDER BY
      sum DESC
  `)

  // create most trendy author materialized
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${trendyView} AS
    SELECT
      target_id,
      COUNT(DISTINCT user_id) AS count
    FROM
      action_user
    WHERE
      NOW() - updated_at <= INTERVAL '90 day'
    GROUP BY
      target_id
    ORDER BY
      count DESC
  `)
}

exports.down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${activeView}`)
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${appreciatedView}`)
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${trendyView}`)
}
