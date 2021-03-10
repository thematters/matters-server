const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('summary_customized').defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('summary_customized')
  })
}
