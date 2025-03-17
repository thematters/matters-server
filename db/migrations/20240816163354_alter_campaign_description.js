const table = 'campaign'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('description').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('description').notNullable().alter()
  })
}
