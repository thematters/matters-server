const table = 'article'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['id', 'state', 'author_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['id', 'state', 'author_id'])
  })
}
