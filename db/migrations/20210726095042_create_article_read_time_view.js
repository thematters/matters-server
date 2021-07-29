const materialized_view_name = 'article_read_time_materialized'

exports.up = async (knex) => {
  // create materialized view
  await knex.raw(/*sql*/ `
    DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE

    CREATE MATERIALIZED VIEW ${materialized_view_name} AS
    SELECT
      article_id as id,
      article_id,
      sum(read_time) AS sum_read_time
    FROM article_read_count
    JOIN "user" ON "user".id = article_read_count.user_id
    WHERE article_read_count.user_id IS NOT NULL
      AND "user".state in ('active', 'onboarding')
    GROUP BY article_id
  `)

  // add indexes
  await knex.schema.table(materialized_view_name, (t) => {
    t.index('article_id')
  })
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE`
  )
}
