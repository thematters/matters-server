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
      'dispute-withdrawn-funds',
    ])
  )
}

exports.down = async (knex) => {
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
}
