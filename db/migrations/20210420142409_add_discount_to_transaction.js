const table = 'transaction'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.decimal('discount', 36, 18).defaultTo(0)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('discount')
  })
}
