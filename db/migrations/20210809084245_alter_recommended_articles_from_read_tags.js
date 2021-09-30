const materialized_view_name =
  "recommended_articles_from_read_tags_materialized";
const tag_article_limit = 20;

exports.up = async (knex) => {
  // create materialized view
  await knex.raw(/*sql*/ `
    DROP MATERIALIZED VIEW IF EXISTS ${materialized_view_name} CASCADE;

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
        LEFT JOIN article ON article.id = art.article_id
        LEFT JOIN "user" ON "user".id = article.author_id
        WHERE article.state = 'active'
          AND "user".state = 'active'
      ) t
      WHERE t.row_num <= ${tag_article_limit}
    )


    SELECT
      row_number() over (order by t.user_id, t.article_id) AS id,
      t.user_id,
      t.article_id,
      tags_based,
      score
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
    LEFT JOIN article_read_count arc ON arc.article_id = t.article_id
      AND arc.user_id = t.user_id
    LEFT JOIN article ON article.id = t.article_id
      AND article.author_id = t.user_id
    WHERE arc.article_id IS NULL
      AND article.author_id IS NULL
    ORDER BY t.user_id ASC, score DESC
  `);

  // add indexes
  await knex.schema.table(materialized_view_name, (t) => {
    t.index("user_id");
  });
};

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW IF EXISTS ${materialized_view_name} CASCADE`
  );
};
