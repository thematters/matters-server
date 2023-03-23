const table_transaction = 'transaction'

export const up = async (knex) => {
  // transaction
  await knex.schema.table(table_transaction, (t) => {
    t.index('target_id')
      .index('target_type')
      .index(['purpose', 'state', 'target_id', 'target_type'])
  })
}

export const down = async (knex) => {
  // transaction
  await knex.schema.table(table_transaction, (t) => {
    t.dropIndex('target_id')
      .dropIndex('target_type')
      .dropIndex(['purpose', 'state', 'target_id', 'target_type'])
  })
}
