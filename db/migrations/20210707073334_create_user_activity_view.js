exports.up = async (knex) => {
  /**
   * Define a function that creates a materialized view
   * by a given period value
   */
  const createUserActivityViews = async (materialized_view_name, period) => {
    // create view
    await knex.raw(/*sql*/ `
      DROP MATERIALIZED VIEW ${materialized_view_name} CASCADE;

      CREATE MATERIALIZED VIEW ${materialized_view_name} AS
      WITH
      /* UserPublishArticleActivity */
      article_period AS (SELECT * FROM article WHERE created_at >= now() - interval '${period}' day),

      /* UserBroadcastCircleActivity */
      circle_boardcast_period AS (SELECT * FROM comment WHERE state = 'active' AND "type" = 'circle_broadcast' AND created_at >= now() - interval '${period}' day),

      /* UserCreateCircleActivity */
      circle_period AS (SELECT * FROM circle WHERE state = 'active' AND created_at >= now() - interval '${period}' day),

      /* UserCollectArticleActivity */
      collection_period AS (SELECT * FROM collection WHERE created_at >= now() - interval '${period}' day),

      /* UserSubscribeCircleActivity */
      cirlce_subscription_period AS (SELECT * FROM circle_subscription_item WHERE archived = false AND created_at >= now() - interval '${period}' day),

      /* UserFollowUserActivity */
      user_follow_period AS (SELECT * FROM action_user WHERE action = 'follow' AND created_at >= now() - interval '${period}' day),

      /* UserDonateArticleActivity */
      article_donation_period AS (SELECT * FROM transaction WHERE state = 'succeeded' AND purpose = 'donation' AND created_at >= now() - interval '${period}' day),

      /* UserBookmarkArticleActivity */
      article_bookmark_period AS (SELECT * FROM action_article WHERE action = 'subscribe' AND created_at >= now() - interval '${period}' day),

      /* UserAddArticleTagActivity */
      article_tag_period AS (SELECT * FROM article_tag WHERE selected = TRUE and created_at >= now() - interval '${period}' day)

      SELECT row_number() over (order by created_at desc) AS id, * FROM (
        SELECT
          'UserPublishArticleActivity' AS "type",
          author_id AS actor_id,
          id AS node_id,
          'Article' AS node_type,
          null AS target_id,
          null AS target_type,
          created_at
        FROM article_period

        UNION
        SELECT
          'UserBroadcastCircleActivity' AS "type",
          author_id AS actor_id,
          id AS node_id,
          'Comment' AS node_type,
          target_id,
          'Circle' AS target_type,
          created_at
        FROM circle_boardcast_period

        UNION
        SELECT
          'UserCreateCircleActivity' AS "type",
          owner AS actor_id,
          id AS node_id,
          'Circle' AS node_type,
          null AS target_id,
          null AS target_type,
          created_at
        FROM circle_period

        UNION
        SELECT
          'UserCollectArticleActivity' AS "type",
          article.author_id AS actor_id,
          article_id AS node_id,
          'Article' AS node_type,
          entrance_id AS target_id,
          'Article' AS target_type,
          collection_period.created_at AS created_at
        FROM collection_period LEFT JOIN article ON article.id = article_id

        UNION
        SELECT
          'UserSubscribeCircleActivity' AS "type",
          user_id AS actor_id,
          circle.id AS node_id,
          'Circle' AS node_type,
          null AS target_id,
          null AS target_type,
          cirlce_subscription_period.created_at
          FROM cirlce_subscription_period LEFT JOIN circle_price ON circle_price.id = price_id
        LEFT JOIN circle ON circle.id = circle_price.circle_id

        UNION
        SELECT
          'UserFollowUserActivity' AS "type",
          user_id AS actor_id,
          target_id AS node_id,
          'User' AS node_type,
          null AS target_id,
          null AS target_type,
          created_at
        FROM user_follow_period

        UNION
        SELECT
          'UserDonateArticleActivity' AS "type",
          sender_id AS actor_id,
          target_id AS node_id,
          'Article' AS node_type,
          null AS target_id,
          null AS target_type,
          created_at
        FROM article_donation_period

        UNION
        SELECT
          'UserBookmarkArticleActivity' AS "type",
          user_id AS actor_id,
          target_id AS node_id,
          'Article' AS node_type,
          null AS target_id,
          null AS target_type,
          created_at
        FROM article_bookmark_period

        UNION
        SELECT
          'UserAddArticleTagActivity' AS "type",
          article.author_id AS actor_id,
          article_id AS node_id,
          'Article' AS node_type,
          tag_id AS target_id,
          'Tag' AS target_type,
          article_tag_period.created_at
        FROM article_tag_period LEFT JOIN article ON article.id = article_id
        ) AS user_activity
    `)

    // add indexes
    await knex.schema.table(materialized_view_name, (t) => {
      t.index('id')
        .index('type')
        .index(['node_id', 'node_type'])
        .index(['target_id', 'target_type'])
    })
  }

  /**
   * Create views
   */
  await createUserActivityViews('user_activity_materialized', 30)
  await createUserActivityViews('user_activity_long_materialized', 90)
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW user_activity_long_materialized CASCADE`
  )
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW user_activity_materialized CASCADE`
  )
}
