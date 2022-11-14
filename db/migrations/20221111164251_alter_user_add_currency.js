const table = 'user'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('currency', ['USD', 'TWD', 'HKD'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('currency')
  })
}
