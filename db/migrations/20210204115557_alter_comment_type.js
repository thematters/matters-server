import { alterEnumString } from '../utils.js'

const commentTable = 'comment'
const activityView = 'article_activity_view'
const activityMaterilized = 'article_activity_materialized'
const topicView = 'article_count_view'
const topicMaterialized = 'article_count_materialized'
const valueView = `article_value_view`
const valueMaterialized = `article_value_materialized`
const hottestAView = `article_hottest_a_view`
const hottestAMaterialized = `article_hottest_a_materialized`
const hottestBView = `article_hottest_b_view`
const hottestBMaterialized = `article_hottest_b_materialized`
const hottestView = `article_hottest_view`
const hottestMaterialized = `article_hottest_materialized`
const featuredCommentMaterialized = 'featured_comment_materialized'

const time_window = 3
const donation_decay_factor = 0.8
const boost = 1
const boost_window = 3
const matty_donation_decay_factor = 0.95

export const up = async (knex) => {
  /**
   * Step 0: drop views
   */
  // deprecated
  await knex.raw(/* sql */ `
    DROP VIEW IF EXISTS ${hottestAView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestAMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${hottestBView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestBMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${activityView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${activityMaterilized} CASCADE;
  `)
  // to be altered
  await knex.raw(/* sql */ `
    DROP VIEW IF EXISTS ${topicView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${topicMaterialized} CASCADE;

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
    CREATE VIEW ${hottestView} AS WITH original_score AS (
      SELECT
        max(read_time_efficiency_boost) AS max_efficiency
      FROM (
        SELECT
          a.id,
          CASE WHEN extract(epoch FROM now() - a.created_at) <= ${boost_window} * 3600 THEN
            ${boost} * (sum(arc.read_time)::decimal / least(extract(epoch FROM now() - a.created_at)::decimal + 1,
                ${time_window} * 24 * 3600)) ^ 0.5
          ELSE
            (sum(arc.read_time)::decimal / least(extract(epoch FROM now() - a.created_at)::decimal + 1,
                ${time_window} * 24 * 3600)) ^ 0.5
          END AS read_time_efficiency_boost
        FROM
          article a
          JOIN public.user u ON a.author_id = u.id
          JOIN article_read_count arc ON a.id = arc.article_id
        WHERE
          a.state = 'active'
          AND arc.created_at >= to_timestamp((extract(epoch FROM now()) - ${time_window} * 24 * 3600))
          AND arc.user_id IS NOT NULL
        GROUP BY
          a.id) t
    )
    SELECT
      article.id,
      article.title,
      article.created_at,
      'https://matters.news/@-/-' || article.media_hash AS link,
      coalesce(t.score, 0) AS score
    FROM
      article
      LEFT JOIN (
        SELECT
          t1.*,
          t2.latest_transaction,
          t3.latest_transaction_matty,
          (
            SELECT
              max_efficiency
            FROM
              original_score) AS max_efficiency,
            greatest((
              SELECT
                max_efficiency FROM original_score) * coalesce(${donation_decay_factor} ^ (extract(epoch FROM now() - t2.latest_transaction)::decimal / 3600), 0), (
                SELECT
                  max_efficiency FROM original_score) * coalesce(${matty_donation_decay_factor} ^ (extract(epoch FROM now() - t3.latest_transaction_matty)::decimal / 3600), 0)) AS donation_score,
            t1.read_time_efficiency_boost + greatest((
              SELECT
                max_efficiency FROM original_score) * coalesce(${donation_decay_factor} ^ (extract(epoch FROM now() - t2.latest_transaction)::decimal / 3600), 0), (
                SELECT
                  max_efficiency FROM original_score) * coalesce(${matty_donation_decay_factor} ^ (extract(epoch FROM now() - t3.latest_transaction_matty)::decimal / 3600), 0)) AS score
          FROM (
            SELECT
              a.id,
              a.title,
              a.created_at,
              u.display_name,
              'https://matters.news/@-/-' || a.media_hash AS link,
              sum(arc.read_time) AS read_seconds_in_time_window,
              (sum(arc.read_time)::decimal / least(extract(epoch FROM now() - a.created_at)::decimal + 1, ${time_window} * 24 * 3600)) ^ 0.5 AS read_time_efficiency,
              CASE WHEN extract(epoch FROM now() - a.created_at) <= ${boost_window} * 3600 THEN
                ${boost} * (sum(arc.read_time)::decimal / least(extract(epoch FROM now() - a.created_at)::decimal + 1, ${time_window} * 24 * 3600)) ^ 0.5
              ELSE
                (sum(arc.read_time)::decimal / least(extract(epoch FROM now() - a.created_at)::decimal + 1, ${time_window} * 24 * 3600)) ^ 0.5
              END AS read_time_efficiency_boost
            FROM
              article a
              JOIN public.user u ON a.author_id = u.id
              JOIN article_read_count arc ON a.id = arc.article_id
            WHERE
              a.state = 'active'
              AND arc.created_at > to_timestamp((extract(epoch FROM now()) - ${time_window} * 24 * 3600))
              AND arc.user_id IS NOT NULL
            GROUP BY
              a.id,
              u.display_name) t1
          LEFT JOIN (
            SELECT
              target_id,
              max(updated_at) AS latest_transaction
            FROM
              TRANSACTION
            WHERE
              target_type = 4
              AND state = 'succeeded'
              AND purpose = 'donation'
              and(currency = 'LIKE'
                AND amount >= 100
                OR currency = 'HKD')
              AND sender_id NOT in(81, 20053)
            GROUP BY
              target_id) t2 ON t1.id = t2.target_id
          LEFT JOIN (
            SELECT
              target_id,
              max(updated_at) AS latest_transaction_matty
            FROM
              TRANSACTION
            WHERE
              target_type = 4
              AND state = 'succeeded'
              AND purpose = 'donation'
              AND sender_id in(81, 20053)
            GROUP BY
              target_id) t3 ON t1.id = t3.target_id -- Matty boost
    ) t ON article.id = t.id
    WHERE
      article.state = 'active'
    ORDER BY
      score DESC,
      created_at DESC;

    CREATE materialized VIEW ${hottestMaterialized} AS
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

export const down = async (knex) => {
  await knex.raw(/* sql */ `
    DROP VIEW IF EXISTS ${hottestAView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestAMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${hottestBView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestBMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${hottestView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${hottestMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${topicView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${topicMaterialized} CASCADE;

    DROP VIEW IF EXISTS ${activityView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${activityMaterilized} CASCADE;

    DROP VIEW IF EXISTS ${valueView} CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS ${valueMaterialized} CASCADE;

    DROP MATERIALIZED VIEW IF EXISTS ${featuredCommentMaterialized} CASCADE;
  `)

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
