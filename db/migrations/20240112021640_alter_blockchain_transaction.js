const table = 'blockchain_transaction'

exports.up = async (knex) => {
  // add new columns
  await knex.schema.table(table, (t) => {
    t.string('from')
    t.string('to')
    t.bigInteger('block_number').unsigned()
  })

  // migrate from `blockchain_curation_event` table
  const events = await knex('blockchain_curation_event').select(
    'blockchain_transaction_id',
    'curator_address',
    'contract_address'
  )
  for (const event of events) {
    await knex(table).where('id', event.blockchain_transaction_id).update({
      from: event.curator_address,
      to: event.contract_address,
    })
  }
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('block_number')
    t.dropColumn('to')
    t.dropColumn('from')
  })
}
