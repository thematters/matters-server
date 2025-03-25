const table = 'article'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['author_id', 'state'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['author_id', 'state'])
  })
}
