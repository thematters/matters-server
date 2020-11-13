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
      author_id as user_id,
      up,
      down
    FROM (
      SELECT
        author_id,
        SUM(COALESCE(base.up, 0)) AS up,
        SUM(COALESCE(base.down, 0)) AS down
      FROM
        comment
      LEFT JOIN (
        SELECT
          target_id,
          SUM(CASE WHEN action = 'up_vote' THEN 1 END) AS up,
          SUM(CASE WHEN action = 'down_vote' THEN 1 END) AS down
        FROM
          action_comment
        GROUP BY
          target_id
      ) AS base ON base.target_id = comment.id
      WHERE
        comment.state = 'active'
        AND NOW() - comment.created_at <= INTERVAL '90 day'
      GROUP BY
        author_id
    ) AS source
    WHERE
      down / COALESCE(NULLIF(up + down, 0), 1) <= 0.1
  `)

  // create most appreciated author materialized
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${appreciatedView} AS
    SELECT
      recipient_id as user_id,
      SUM(amount) AS sum
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
      target_id as user_id,
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
