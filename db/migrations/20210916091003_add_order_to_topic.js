const table = 'topic'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.integer('order').defaultTo(0)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('order')
  })
}
