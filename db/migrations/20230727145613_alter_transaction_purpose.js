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
      'dispute',
    ])
  )

  await knex(table)
    .where({ purpose: 'dispute-withdrawn-funds' })
    .update({ purpose: 'dispute' })

  await knex.raw(
    alterEnumString(table, 'purpose', [
      'donation',
      'add-credit',
      'refund',
      'payout',
      'subscription',
      'subscription-split',
      'dispute',
      'payout-reversal',
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
      'dispute-withdrawn-funds',
      'dispute',
    ])
  )

  await knex(table)
    .where({ purpose: 'dispute' })
    .update({ purpose: 'dispute-withdrawn-funds' })

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
