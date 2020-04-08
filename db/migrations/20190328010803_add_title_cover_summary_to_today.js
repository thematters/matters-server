const table = 'matters_today'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('cover')
    t.string('title')
    t.string('summary')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('cover')
    t.dropColumn('title')
    t.dropColumn('summary')
  })
}
