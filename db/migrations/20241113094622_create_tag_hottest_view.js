const table = 'tag_hottest_materialized'

export const up = async (knex) => {
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${table} AS
    WITH raw_article_data AS (
      SELECT
        at.tag_id,
        to_char(article.created_at, 'YYYYMM') AS month,
        at.article_id,
        article.author_id
      FROM article_tag AS at
        INNER JOIN article ON article.id = at.article_id
        INNER JOIN "user" AS u ON u.id = article.author_id
      WHERE article.state = 'active'
        AND u.state NOT in('frozen', 'archived')
        AND u.id NOT in(SELECT user_id FROM user_restriction)
    ),
    monthly_stats AS (
      SELECT tag_id, month,
        count(article_id)::int articles,
        count(DISTINCT author_id)::int users
      FROM raw_article_data
      GROUP BY tag_id, month
    ),
    tag_averages AS (
      SELECT tag_id,
        count(month) AS months,
        avg(articles) AS mean_articles,
        avg(users) AS mean_users
      FROM monthly_stats
      GROUP BY tag_id
    ),
    tag_z_scores AS (
      SELECT tag_id, months,
        (months - avg(months) OVER()) / NULLIF(stddev(months) OVER(), 0) AS z_months,
        mean_articles,
        (mean_articles - avg(mean_articles) OVER()) / NULLIF(stddev(mean_articles) OVER(), 0) AS z_articles,
        mean_users,
        (mean_users - avg(mean_users) OVER()) / NULLIF(stddev(mean_users) OVER(), 0) AS z_users
      FROM tag_averages
    ),
    significant_scores AS (
      SELECT tag_id, months,
        CASE WHEN z_months < 2 THEN 0 ELSE z_months END AS z_months,
        mean_articles,
        CASE WHEN z_articles < 2 THEN 0 ELSE z_articles END AS z_articles,
        mean_users,
        CASE WHEN z_users < 2 THEN 0 ELSE z_users END AS z_users
      FROM tag_z_scores
    )
    SELECT
      base.tag_id,
      tag.content,
      base.months,
      base.mean_articles,
      base.mean_users,
      base.score
    FROM (
      SELECT *, z_months * z_articles * z_users AS score
      FROM significant_scores
    ) AS base
    INNER JOIN tag ON tag.id = base.tag_id
    WHERE base.score > 0
    ORDER BY base.score DESC
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX ${table}_tag_id ON ${table} (tag_id)
  `)
}

export const down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE`)
}
