import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
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

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'donation',
      'add-credit',
      'refund',
      'payout',
    ])
  )
}
