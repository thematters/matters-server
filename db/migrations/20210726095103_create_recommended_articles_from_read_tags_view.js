const materialized_view_name =
  'recommended_articles_from_read_tags_materialized'
const tag_article_limit = 20
const article_prepared_limit = 20

exports.up = async (knex) => {
  // create materialized view
  await knex.raw(/*sql*/ `
    CREATE MATERIALIZED VIEW ${materialized_view_name} AS

    WITH tag_article_read_time AS (
      SELECT
        *
      FROM (
        SELECT
          article_tag.tag_id,
          art.article_id,
          art.sum_read_time,
          ROW_NUMBER() OVER (PARTITION BY article_tag.tag_id ORDER BY art.sum_read_time DESC) AS row_num
        FROM article_tag
        JOIN article_read_time_materialized art
          ON article_tag.article_id = art.article_id
      ) t
      WHERE t.row_num <= ${tag_article_limit}
    )


    SELECT
      row_number() over (order by user_id, article_id) AS id,
      user_id,
      article_id,
      tags_based,
      score
    FROM (
      SELECT
        t.*,
        ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.score DESC) AS row_num
      FROM (
        SELECT
          rrt.user_id,
          tart.article_id,
          array_agg(tart.tag_id ORDER BY rrt.tag_score DESC) AS tags_based,
          sum(rrt.tag_score * tart.sum_read_time) AS score
        FROM recently_read_tags_materialized rrt
        LEFT JOIN tag_article_read_time tart ON rrt.tag_id = tart.tag_id
        GROUP BY rrt.user_id, tart.article_id
      ) t
    ) tt
    WHERE tt.row_num <= ${article_prepared_limit}
    ORDER BY user_id ASC, score DESC
  `)

  // add indexes
  await knex.schema.table(materialized_view_name, (t) => {
    t.index('user_id')
  })
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE`
  )
}
