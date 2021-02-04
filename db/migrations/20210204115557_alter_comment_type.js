const { alterEnumString } = require('../utils')

const commentTable = 'comment'
const hottestView = 'article_activity_view'
const hottestMaterilized = 'article_activity_materialized'
const topicView = 'article_count_view'
const topicMaterialized = 'article_count_materialized'
const valueView = `article_value_view`
const valueMaterialized = `article_value_materialized`
const hottestAView = `article_hottest_a_view`
const hottestAMaterialized = `article_hottest_a_materialized`
const featuredCommentMaterialized = 'featured_comment_materialized'

exports.up = async (knex) => {
  /**
   * Step 0: drop views
   */
  await knex.raw(/* sql */ `
    DROP VIEW IF EXISTS ${hottestAView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestAMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${topicView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${topicMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${hottestView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestMaterilized} CASCADE;

    DROP VIEW IF EXISTS ${valueView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${valueMaterialized} CASCADE;

    DROP MATERIALIZED VIEW IF EXISTS ${featuredCommentMaterialized} CASCADE;
  `)

  /**
   * Step 1: alter comment
   */
  await knex.schema.table(commentTable, (t) => {
    t.dropIndex(['article_id', 'state'])
    t.index(['state', 'type'])
  })

  await knex.raw(
    alterEnumString(commentTable, 'type', [
      'article',
      'circle_discussion',
      'circle_broadcast',
    ])
  )

  await knex.schema.alterTable(commentTable, (t) => {
    t.dropForeign('article_id')
    t.bigInteger('article_id').unsigned().nullable().alter()
  })

  /**
   * Step 2: add back views with `target_id` instead of `article_id`
   */
  // topic
  await knex.raw(/*sql*/ `
    CREATE VIEW ${topicView} AS
      SELECT
        id,
        title,
        comments_total,
        commenters_7d,
        commenters_1d,
        recent_comment_since,
        (
          comments_total * 1 / 5 + commenters_7d * 10 + commenters_1d * 50 * (
            CASE WHEN recent_comment_since <= 8100 THEN
              sqrt(8100 / recent_comment_since)
            ELSE
              1
            END)) * (
          CASE WHEN commenters_7d > 2 THEN
            1
          ELSE
            0
          END) AS score
      FROM (
        SELECT
          article.id,
          title,
          count(*) AS comments_total,
          count(DISTINCT (
              CASE WHEN now() - "comment"."created_at" <= '1 week' THEN
                "comment"."author_id"
              END)) AS commenters_7d,
          count(DISTINCT (
              CASE WHEN now() - "comment"."created_at" <= '1 day' THEN
                "comment"."author_id"
              END)) AS commenters_1d,
          extract(epoch FROM now() - max("comment"."created_at")) AS recent_comment_since
        FROM
          article
        LEFT JOIN comment ON "article"."id" = "comment"."target_id"
      WHERE
        "comment"."state" = 'active'
        AND "comment"."type" = 'article'
      GROUP BY
        article.id) AS comment_score;

    CREATE materialized VIEW ${topicMaterialized} AS
      SELECT
        *
      FROM
        ${topicView}
  `)

  // hottest
  await knex.raw(/*sql*/ `
    CREATE VIEW ${hottestView} AS
      SELECT
        *,
        base_score + boost_score_1 + boost_score_2 AS score
      FROM (
        SELECT
          article.id,
          article.title,
          article.created_at,
          least((0.5 * coalesce(comment_12_hrs, 0) + 2 * coalesce(like_24_hrs, 0)) * (2 + post_days) / (1 + post_days), 300) AS base_score,
          (15 * coalesce(comment_30_mins, 0) + 60 * coalesce(like_30_mins, 0)) AS boost_score_1,
          greatest(120 - 2 * since_comment, 0) + greatest(240 - 2 * since_like, 0) AS boost_score_2
        FROM
          article
          /* past comment count */
        LEFT JOIN (
          SELECT
            target_id,
            sum((created_at >= now() - interval '12 hours')::int) AS comment_12_hrs,
            sum((created_at >= now() - interval '30 minutes')::int) AS comment_30_mins
          FROM
            comment
          WHERE
            "comment"."type" = 'article'
          GROUP BY
            target_id) AS cc ON cc.target_id = article.id
          /* past 2 days like */
        LEFT JOIN (
          SELECT
            reference_id,
            sum(amount) AS like_24_hrs
          FROM
            appreciation
          WHERE
            purpose = 'appreciate'
            AND created_at >= now() - interval '24 hours'
          GROUP BY
            reference_id) AS lc1 ON lc1.reference_id = article.id
          /* past 30 minutes like */
        LEFT JOIN (
          SELECT
            reference_id,
            sum(amount) AS like_30_mins
          FROM
            appreciation
          WHERE
            purpose = 'appreciate'
            AND created_at >= now() - interval '30 minutes'
          GROUP BY
            reference_id) AS lc2 ON lc2.reference_id = article.id
          /* number of days since published */
        LEFT JOIN (
          SELECT
            id,
            CURRENT_DATE - created_at::date AS post_days
          FROM
            article) AS pd ON pd.id = article.id
          /* minutes since first comment */
          LEFT JOIN (
            SELECT
              target_id,
              extract(epoch FROM now() - min(created_at)) / 60 AS since_comment
            FROM
              comment
            WHERE
              created_at >= now() - interval '30 days'
              AND "comment"."type" = 'article'
            GROUP BY
              target_id) AS fc ON fc.target_id = article.id
            /* minutes since first like */
          LEFT JOIN (
            SELECT
              reference_id,
              extract(epoch FROM now() - min(created_at)) / 60 AS since_like
            FROM
              appreciation
            WHERE
              purpose = 'appreciate'
              AND created_at >= now() - interval '30 days'
            GROUP BY
              reference_id) AS fl ON fl.reference_id = article.id) AS scores
      WHERE
        id NOT in(
          SELECT
            article_id FROM matters_today
          ORDER BY
            updated_at DESC
          LIMIT 1
      );

    CREATE materialized VIEW ${hottestMaterilized} AS
      SELECT
        *
      FROM
        ${hottestView}
  `)

  // value
  await knex.raw(/*sql*/ `
    CREATE VIEW ${valueView} AS
      SELECT
        id,
        base_score1 + base_score2 + boost_score1 + boost_score2 AS score,
        base_score1,
        base_score2,
        boost_score1,
        boost_score2
      FROM (
        SELECT
          article.id,
          least(coalesce(donation_sum, 0), 1000) AS base_score1,
          least(coalesce(read_3_days, 0) / 1000 * (2 + post_days) / (1 + post_days), 1000) AS base_score2,
          200 * coalesce(like_10_mins, 0) + 1000 * coalesce(donation_30_mins, 0) AS boost_score1,
          greatest(360 - since_like, 0) * 2 + greatest(720 - since_donate, 0) * 2 AS boost_score2
        FROM
          article
        LEFT JOIN (
          SELECT
            target_id,
            sum(720 / power((CURRENT_DATE - created_at::date) + 1, 2)) AS donation_sum
          FROM
            TRANSACTION
          WHERE
            transaction.purpose = 'donation'
          GROUP BY
            target_id) AS d1 ON d1.target_id = article.id
        LEFT JOIN (
          SELECT
            article_id,
            sum(cast(read_time AS numeric) / cast(timed_count AS numeric)) AS read_3_days
          FROM
            article_read_count
          WHERE
            updated_at >= now() - interval '3 days'
            AND user_id IS NOT NULL
          GROUP BY
            article_id) AS r1 ON r1.article_id = article.id
        LEFT JOIN (
          SELECT
            reference_id,
            sum(amount) AS like_10_mins
          FROM
            appreciation
          WHERE
            appreciation.purpose = 'appreciate'
            AND created_at >= now() - interval '10 minutes'
          GROUP BY
            reference_id) AS lc2 ON lc2.reference_id = article.id
          /* past 10 minutes appreciation */
        LEFT JOIN (
          SELECT
            target_id,
            count(id) AS donation_30_mins
          FROM
            TRANSACTION
          WHERE
            transaction.purpose = 'donation'
            AND created_at >= now() - interval '30 minutes'
          GROUP BY
            target_id) AS d2 ON d2.target_id = article.id
        LEFT JOIN (
          SELECT
            id,
            CURRENT_DATE - created_at::date AS post_days
          FROM
            article) AS pd ON pd.id = article.id
          /* article created_at minutes */
          LEFT JOIN (
            SELECT
              target_id,
              extract(epoch FROM now() - min(created_at)) / 60 AS since_donate
            FROM
              TRANSACTION
            WHERE
              transaction.purpose = 'donation'
              AND transaction.currency = 'HKD'
              AND created_at >= now() - interval '30 days'
            GROUP BY
              target_id) AS fd ON fd.target_id = article.id
          LEFT JOIN (
            SELECT
              reference_id,
              extract(epoch FROM now() - min(created_at)) / 60 AS since_like
            FROM
              appreciation
            WHERE
              created_at >= now() - interval '30 days'
            GROUP BY
              reference_id) AS fl ON fl.reference_id = article.id
            /* minutes since first appreciation */
      ) AS scores;

      CREATE materialized VIEW ${valueMaterialized} AS
        SELECT
          *
        FROM
          ${valueView}
        WHERE
          base_score1 + base_score2 + boost_score1 + boost_score2 > 0
    `)

  // featured comment
  await knex.raw(/*sql*/ `
    CREATE materialized VIEW ${featuredCommentMaterialized} AS
      SELECT
        *
      FROM (
        SELECT
          *,
          (coalesce(upvote_count, 0) - coalesce(downvote_count, 0) + 1) * sqrt(coalesce(upvote_count, 0) + coalesce(downvote_count, 0)) AS score
        FROM
          comment
        LEFT JOIN (
          SELECT
            target_id AS upvoted_id,
            coalesce(count(id), 0) AS upvote_count
          FROM
            action_comment AS action
          WHERE
            action.action = 'up_vote'
          GROUP BY
            upvoted_id) AS upvotes ON comment.id = upvotes.upvoted_id
        LEFT JOIN (
          SELECT
            target_id AS downvoted_id,
            coalesce(count(id), 0) AS downvote_count
          FROM
            action_comment AS action
          WHERE
            action.action = 'down_vote'
          GROUP BY
            downvoted_id) AS downvotes ON comment.id = downvotes.downvoted_id
        WHERE
          parent_comment_id IS NULL) AS comment_score
      WHERE
        pinned = TRUE
        OR score > 20
  `)
}

exports.down = async (knex) => {
  await knex.raw(/* sql */ `
    DROP VIEW IF EXISTS ${hottestAView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestAMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${topicView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${topicMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${hottestView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestMaterilized} CASCADE;

    DROP VIEW IF EXISTS ${valueView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${valueMaterialized} CASCADE;

    DROP MATERIALIZED VIEW IF EXISTS ${featuredCommentMaterialized} CASCADE;
  `)

  await knex.schema.alterTable(commentTable, function (t) {
    t.bigInteger('article_id').unsigned().notNullable().alter()
    t.foreign('article_id').references('id').inTable('article')
  })

  await knex.raw(
    alterEnumString(commentTable, 'type', [
      'article',
      'circle_discussion',
      'circle_announcement',
    ])
  )

  await knex.schema.table(commentTable, (t) => {
    t.index(['article_id', 'state'])
    t.dropIndex(['state', 'type'])
  })
}
