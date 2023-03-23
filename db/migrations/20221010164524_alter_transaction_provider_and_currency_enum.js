import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'provider', [
      'stripe',
      'likecoin',
      'matters',
      'blockchain',
    ])
  )
  await knex.raw(alterEnumString(table, 'currency', ['HKD', 'LIKE', 'USDT']))
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'provider', ['stripe', 'likecoin', 'matters'])
  )
  await knex.raw(alterEnumString(table, 'currency', ['HKD', 'LIKE']))
}
