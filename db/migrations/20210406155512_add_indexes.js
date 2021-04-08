const table_transaction = 'transaction'

exports.up = async (knex) => {
  // transaction
  await knex.schema.table(table_transaction, (t) => {
    t.index('target_id')
      .index('target_type')
      .index(['purpose', 'state', 'target_id', 'target_type'])
  })
}

exports.down = async (knex) => {
  // transaction
  await knex.schema.table(table_transaction, (t) => {
    t.dropIndex('target_id')
      .dropIndex('target_type')
      .dropIndex(['purpose', 'state', 'target_id', 'target_type'])
  })
}
