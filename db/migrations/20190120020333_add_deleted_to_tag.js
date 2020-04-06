const table = 'tag'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('deleted').defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('deleted')
  })
}
