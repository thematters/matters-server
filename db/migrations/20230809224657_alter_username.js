const table = 'user'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.setNullable('user_name')
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropNullable('user_name')
  })
}
