const table = 'article_stats_materialized'

exports.up = async (knex) => {
  await knex.raw(`
    CREATE MATERIALIZED VIEW ${table} AS
    SELECT
      COALESCE(r.article_id, c.reference_id) as article_id,
      COALESCE(r.reads, 0) as reads,
      COALESCE(c.claps, 0) as claps
    FROM (
      SELECT article_id, sum(timed_count)::int AS reads
      FROM article_read_count
      WHERE user_id IS NOT NULL
      GROUP BY article_id
    ) r
    FULL OUTER JOIN (
      SELECT reference_id, sum(amount)::int AS claps
      FROM appreciation
      WHERE purpose = 'appreciate'
      GROUP BY reference_id
    ) c ON r.article_id = c.reference_id
  `)

  await knex.raw(`
    CREATE UNIQUE INDEX ${table}_id ON ${table} (article_id)
  `)
}

exports.down = async (knex) => {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE`)
}
