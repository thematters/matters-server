const table = 'asset'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('draft')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('draft')
  })
}
