const table = 'tag_related_authors_materialized'

export const up = async (knex) => {
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${table} AS
    WITH active_articles AS (
      SELECT
        article.author_id,
        article.id as article_id,
        at.tag_id
      FROM article_tag as at
      INNER JOIN article ON article.id = at.article_id
      INNER JOIN "user" as u ON u.id = article.author_id
      WHERE article.state = 'active'
        AND u.state NOT IN ('frozen', 'archived')
        AND u.id NOT IN (SELECT user_id FROM user_restriction)
    ),
    author_stats AS (
      SELECT
        a.tag_id,
        a.author_id,
        avg(COALESCE(s.reads, 0)) as mean_reads,
        avg(COALESCE(s.claps, 0)) as mean_claps
      FROM active_articles as a
      LEFT JOIN article_stats_materialized as s ON s.article_id = a.article_id
      GROUP BY a.tag_id, a.author_id
    ),
    author_scores AS (
      SELECT
        tag_id,
        author_id,
        mean_reads,
        mean_claps,
        (0.85 * mean_reads + 0.15 * mean_claps) as score
      FROM author_stats
    ),
    tag_thresholds AS (
      SELECT
        tag_id,
        percentile_cont(0.25) WITHIN GROUP (ORDER BY score) as threshold
      FROM author_scores
      GROUP BY tag_id
    )
    SELECT
      author_scores.tag_id,
      u.id as author_id,
      author_scores.score
    FROM author_scores
    INNER JOIN "user" as u ON u.id = author_scores.author_id
    INNER JOIN tag_thresholds t ON t.tag_id = author_scores.tag_id
    WHERE author_scores.score > t.threshold
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX ${table}_tag_author ON ${table} (tag_id, author_id)
  `)

  await knex.raw(`
    CREATE INDEX ${table}_tag_id ON ${table} (tag_id)
  `)
}

export const down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE`)
}
