const table = 'search_history'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['created_at'])
    t.index(['user_id', 'archived'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['created_at'])
    t.dropIndex(['user_id', 'archived'])
  })
}
