const { alterEnumString } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'donation',
      'add-credit',
      'refund',
      'payout',
      'subscription',
      'subscription-split',
    ])
  )

  // await knex.schema.alterTable(table, (t) => {
  //   t.string('provider').nullable().alter()
  //   t.string('provider_tx_id').nullable().alter()
  // })
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'donation',
      'add-credit',
      'refund',
      'payout',
    ])
  )

  // await knex.schema.alterTable(table, (t) => {
  //   t.string('provider').notNullable().alter()
  //   t.string('provider_tx_id').notNullable().alter()
  // })
}
