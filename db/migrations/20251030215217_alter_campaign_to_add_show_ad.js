const table = 'campaign'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('show_ad').notNullable().defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('show_ad')
  })
}
