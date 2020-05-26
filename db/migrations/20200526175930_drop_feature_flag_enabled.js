const table = 'feature_flag'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('enabled')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('enabled').notNullable().defaultTo(false)
  })
}
