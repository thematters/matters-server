const table = 'article'

const MAX_REVISION_COUNT = 2

export const up = async (knex) => {
  // add `revision_count` column
  await knex.schema.table(table, (t) => {
    t.integer('revision_count').notNullable().defaultTo(0)
  })

  // update `revision_count`
  await knex.raw(`
    UPDATE
      article
    SET
      revision_count = source.revision_count
    FROM (
      SELECT
        LEAST(COUNT(article_id) - 1, ${MAX_REVISION_COUNT}) AS revision_count,
        article_id
      FROM
        draft
        JOIN article ON article.id = draft.article_id
      WHERE
        publish_state = 'published'
        OR publish_state = 'pending'
      GROUP BY
        article_id) AS source
    WHERE
      source.article_id = article.id
  `)
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('revision_count')
  })
}
