const period = 30
const materialized_view_name = 'user_activity_materialized'

exports.up = async (knex) => {
  // DDL belowed derived from 20240130120003_alter_user_activity_view.js

  await knex.raw(/*sql*/ `
      DROP MATERIALIZED VIEW IF EXISTS ${materialized_view_name} CASCADE;

      CREATE MATERIALIZED VIEW ${materialized_view_name} AS
      WITH
      article_period AS (
        SELECT article.id, article.author_id, article.state, article.created_at FROM article
        LEFT JOIN "user" on article.author_id = "user".id
        WHERE "user".state = 'active'
          AND article.state = 'active'
          AND article.created_at >= now() - interval '${period} day'
      ),
      moment_period AS (
        SELECT moment.id, moment.author_id, moment.state, moment.created_at FROM moment
        LEFT JOIN "user" on moment.author_id = "user".id
        WHERE "user".state = 'active'
          AND moment.state = 'active'
          AND moment.created_at >= now() - interval '${period} day'
      ),
      circle_boardcast_period AS (
        SELECT comment.* FROM comment
        WHERE state = 'active'
          AND "type" = 'circle_broadcast'
          AND parent_comment_id IS NULL
          AND created_at >= now() - interval '${period} day'
      ),
      circle_period AS (
        SELECT circle.* FROM circle
        WHERE circle.state = 'active'
          AND circle.created_at >= now() - interval '${period} day'
      ),
      cirlce_subscription_period AS (
        SELECT circle_subscription_item.* FROM circle_subscription_item
        LEFT JOIN "user" on circle_subscription_item.user_id = "user".id
        WHERE circle_subscription_item.archived = FALSE
          AND "user".state = 'active'
          AND circle_subscription_item.created_at >= now() - interval '${period} day'
      ),
      user_follow_period AS (
        SELECT action_user.* FROM action_user
        LEFT JOIN "user" on action_user.target_id = "user".id
        WHERE action = 'follow'
          AND "user".state = 'active'
          AND action_user.created_at >= now() - interval '${period} day'
      ),
      article_donation_period AS (
        SELECT transaction.* FROM transaction
        LEFT JOIN article on transaction.target_id = article.id
        LEFT JOIN "user" on transaction.recipient_id = "user".id
        WHERE transaction.state = 'succeeded'
          AND article.state = 'active'
          AND "user".state = 'active'
          AND transaction.purpose = 'donation'
          AND transaction.created_at >= now() - interval '${period} day'
      ),
      article_tag_period AS (
        SELECT article_tag.* FROM article_tag
        LEFT JOIN article on article_tag.article_id = article.id
        WHERE article_tag.selected = TRUE
          AND article.state = 'active'
          AND article_tag.created_at >= now() - interval '${period} day'
      )

      SELECT * FROM (
        SELECT
          id AS id,
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
          id AS id,
          'UserPostMomentActivity' AS "type",
          author_id AS actor_id,
          id AS node_id,
          'Moment' AS node_type,
          null::bigint AS target_id,
          null AS target_type,
          created_at
        FROM moment_period

        UNION
        SELECT
          id AS id,
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
          id AS id,
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
          cirlce_subscription_period.id as id,
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
          id as id,
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
          id as id,
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
          article_tag_period.id as id,
          'UserAddArticleTagActivity' AS "type",
          article.author_id AS actor_id,
          article_id AS node_id,
          'Article' AS node_type,
          tag_id AS target_id,
          'Tag' AS target_type,
          article_tag_period.created_at
        FROM article_tag_period LEFT JOIN article ON article.id = article_id
        ) AS user_activity;
    `)

  // add indexes
  await knex.schema.table(materialized_view_name, (t) => {
    t.index('id')
      .index('type')
      .index('actor_id')
      .index('created_at')
      .index(['node_id', 'node_type'])
      .index(['target_id', 'target_type'])
  })
  // add unique index for refresh concurrently
  await knex.schema.table(materialized_view_name, (t) => {
    t.unique(['id', 'type'], { useConstraint: false })
  })
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ `DROP MATERIALIZED VIEW IF EXISTS ${materialized_view_name} CASCADE`
  )
}
