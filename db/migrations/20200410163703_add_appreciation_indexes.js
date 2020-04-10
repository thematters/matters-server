const transaction = 'appreciation'

exports.up = async (knex) => {
  await knex.schema.table(transaction, (t) => {
    t.index(['reference_id', 'purpose'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(transaction, (t) => {
    t.dropIndex(['reference_id', 'purpose'])
  })
}
