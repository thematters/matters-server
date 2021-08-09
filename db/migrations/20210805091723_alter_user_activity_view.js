const period = 30
const materialized_view_name = 'user_activity_materialized'

exports.up = async (knex) => {
  // Drop user_activity_long_materialized
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW IF EXISTS user_activity_long_materialized CASCADE`
  )

  /**
   * Create user_activity_materialized
   */
  // create view
  await knex.raw(/*sql*/ `
      DROP MATERIALIZED VIEW IF EXISTS ${materialized_view_name} CASCADE;

      CREATE MATERIALIZED VIEW ${materialized_view_name} AS
      WITH
      /* UserPublishArticleActivity */
      article_period AS (
        SELECT article.* FROM article
        LEFT JOIN "user" on article.author_id = "user".id
        WHERE "user".state = 'active'
          AND article.state = 'active'
          AND article.created_at >= now() - interval '${period}' day
      ),

      /* UserBroadcastCircleActivity */
      circle_boardcast_period AS (
        SELECT comment.* FROM comment
        WHERE state = 'active'
          AND "type" = 'circle_broadcast'
          AND parent_comment_id IS NULL
          AND created_at >= now() - interval '${period}' day
      ),

      /* UserCreateCircleActivity */
      circle_period AS (
        SELECT circle.* FROM circle
        WHERE circle.state = 'active'
          AND circle.created_at >= now() - interval '${period}' day
      ),

      /* UserSubscribeCircleActivity */
      cirlce_subscription_period AS (
        SELECT circle_subscription_item.* FROM circle_subscription_item
        LEFT JOIN "user" on circle_subscription_item.user_id = "user".id
        WHERE circle_subscription_item.archived = FALSE
          AND "user".state = 'active'
          AND circle_subscription_item.created_at >= now() - interval '${period}' day
      ),

      /* UserFollowUserActivity */
      user_follow_period AS (
        SELECT action_user.* FROM action_user
        LEFT JOIN "user" on action_user.target_id = "user".id
        WHERE action = 'follow'
          AND "user".state = 'active'
          AND action_user.created_at >= now() - interval '${period}' day
      ),

      /* UserDonateArticleActivity */
      article_donation_period AS (
        SELECT transaction.* FROM transaction
        LEFT JOIN article on transaction.target_id = article.id
        LEFT JOIN "user" on transaction.recipient_id = "user".id
        WHERE transaction.state = 'succeeded'
          AND article.state = 'active'
          AND "user".state = 'active'
          AND transaction.purpose = 'donation'
          AND transaction.created_at >= now() - interval '${period}' day
      ),

      /* UserAddArticleTagActivity */
      article_tag_period AS (
        SELECT article_tag.* FROM article_tag
        LEFT JOIN article on article_tag.article_id = article.id
        WHERE article_tag.selected = TRUE
          AND article.state = 'active'
          AND article_tag.created_at >= now() - interval '${period}' day
      )

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
          'UserSubscribeCircleActivity' AS "type",
          user_id AS actor_id,
          circle.id AS node_id,
          'Circle' AS node_type,
          null AS target_id,
          null AS target_type,
          cirlce_subscription_period.created_at
        FROM cirlce_subscription_period
        LEFT JOIN circle_price ON circle_price.id = price_id
        LEFT JOIN circle ON circle.id = circle_price.circle_id
        WHERE circle.state = 'active'

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

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW IF EXISTS user_activity_materialized CASCADE`
  )
}
