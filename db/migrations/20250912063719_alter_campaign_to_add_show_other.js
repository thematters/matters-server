const table = 'campaign'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('show_other').notNullable().defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('show_other')
  })
}
