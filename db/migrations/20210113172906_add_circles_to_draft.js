const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('circles', 'text ARRAY')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('circles')
  })
}
