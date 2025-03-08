const table = 'article_translation'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['article_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['article_id'])
  })
}
