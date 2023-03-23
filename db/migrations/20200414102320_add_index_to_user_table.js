const table_user = 'user'

export const up = async (knex) => {
  // user
  await knex.schema.table(table_user, (t) => {
    t.index('uuid')
  })
}

export const down = async (knex) => {
  // user
  await knex.schema.table(table_user, (t) => {
    t.dropIndex('uuid')
  })
}
