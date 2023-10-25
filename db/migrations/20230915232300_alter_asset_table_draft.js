const table = 'asset'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('draft')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('draft')
  })
}
