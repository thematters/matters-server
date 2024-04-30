const table = 'blockchain_transaction'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('from')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('from')
  })
}
