const table = 'user'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('currency', ['USD', 'TWD', 'HKD'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('currency')
  })
}
