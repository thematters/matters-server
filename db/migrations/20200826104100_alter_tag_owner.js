const table = 'tag'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('owner').unsigned().nullable()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('owner')
  })
}
