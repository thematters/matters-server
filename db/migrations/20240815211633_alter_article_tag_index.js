const table = 'article_tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['tag_id', 'article_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['tag_id', 'article_id'])
  })
}
