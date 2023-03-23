const table = 'article_read_count'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['user_id', 'article_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['user_id', 'article_id'])
  })
}
