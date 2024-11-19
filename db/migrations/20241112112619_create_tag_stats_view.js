const materialized = 'tag_stats_materialized'

exports.up = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${materialized}`)

  await knex.raw(`
    CREATE MATERIALIZED VIEW ${materialized} AS
    WITH article_tags AS (
        SELECT
            at.tag_id,
            at.article_id,
            article.author_id
        FROM article_tag at
            INNER JOIN article
                ON article.id = at.article_id
            INNER JOIN "user" u
                ON u.id = article.author_id
        WHERE article.state = 'active'
            AND u.state NOT IN ('forzen', 'archived')
            AND u.id NOT IN (
                SELECT user_id
                FROM user_restriction
            )
            AND at.created_at AT TIME ZONE 'Asia/Taipei' >= NOW() - INTERVAL '12 months'
            AND at.created_at AT TIME ZONE 'Asia/Taipei' < NOW()
    ),
    tag_stats AS (
        SELECT
            tag_id,
            COUNT(article_id)::INT AS all_articles,
            COUNT(DISTINCT author_id)::INT AS all_users
        FROM article_tags
        GROUP BY tag_id
    ),
    user_threshold AS (
        SELECT DISTINCT
            PERCENTILE_CONT(0.15) WITHIN GROUP (ORDER BY all_users) AS threshold
        FROM tag_stats
    )
    SELECT
        ts.tag_id,
        tag.content,
        ts.all_articles,
        ts.all_users
    FROM tag_stats ts
        INNER JOIN tag
            ON tag.id = ts.tag_id
        CROSS JOIN user_threshold ut
    WHERE ts.all_users > ut.threshold
    ORDER BY
        ts.all_users DESC,
        ts.all_articles DESC
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX ${materialized}_tag_id ON ${materialized} (tag_id)
  `)

  await knex.raw(`
    CREATE INDEX ${materialized}_all_users ON ${materialized} (all_users DESC)
  `)
}

exports.down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${materialized} CASCADE`)
}
