const table = 'article_tag'

export const up = async (knex) => {
  // add creator column
  await knex.schema.table(table, function (t) {
    t.bigInteger('creator').unsigned()
  })

  // update article tag creator
  await knex.raw(`
    UPDATE
      article_tag
    SET
      creator = source.author_id
    FROM
      (
        SELECT
          article.id, article.author_id
        FROM
          article
      ) AS source
    WHERE article_tag.article_id = source.id
  `)
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('creator')
  })
}
