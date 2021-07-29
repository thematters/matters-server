const materialized_view_name = 'recently_read_tags_materialized'

const recent_read_limit = 30
const global_appearance_threshold = 5
const tag_read_limit = 10

exports.up = async (knex) => {
  // create materialized view
  await knex.raw(/*sql*/ `
    DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE

    CREATE MATERIALIZED VIEW ${materialized_view_name} AS

    WITH
    tags_local_appearance AS (
      SELECT
        tt.user_id,
        tt.tag_id,
        tt.content,
        count(1) AS local_appearance
      FROM (
        --- retrieve article tags
        SELECT
          arc.*,
          tag.id AS tag_id,
          tag.content
        FROM (
          --- retrieve recently article read count
          SELECT
            user_id,
            article_id,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS row_num
          FROM article_read_count
          WHERE updated_at >= now() - interval '30' day
          ---|
        ) arc
        JOIN article_tag ON arc.article_id = article_tag.article_id
        LEFT JOIN tag ON article_tag.tag_id = tag.id
        WHERE arc.row_num <= ${recent_read_limit}
        ---|
      ) tt
      GROUP BY tt.user_id, tt.tag_id, tt.content
    ),
    tags_glocal_appearance AS (
      SELECT tag.id, count(1) AS global_appearance
      FROM tag
      JOIN article_tag ON tag.id = article_tag.tag_id
      GROUP BY tag.id
    )


    SELECT
      row_number() over (order by user_id, tag_id) AS id,
      *
    FROM (
      SELECT
        la.user_id,
        la.tag_id,
        la.local_appearance::decimal / ga.global_appearance AS tag_score,
        ROW_NUMBER() OVER (PARTITION BY la.user_id ORDER BY la.local_appearance::decimal / ga.global_appearance DESC) AS row_num
      FROM tags_local_appearance la
      JOIN tags_glocal_appearance ga
      ON la.tag_id = ga.id
      WHERE ga.global_appearance >= ${global_appearance_threshold}
    ) t
    WHERE t.row_num <= ${tag_read_limit}
  `)

  // add indexes
  await knex.schema.table(materialized_view_name, (t) => {
    t.index('user_id').index('tag_id').index('tag_score')
  })
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE`
  )
}
