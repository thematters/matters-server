const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('sticky').defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('sticky')
  })
}
