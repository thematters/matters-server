const { alterEnumString } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
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

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'provider', ['stripe', 'likecoin', 'matters'])
  )
  await knex.raw(alterEnumString(table, 'currency', ['HKD', 'LIKE']))
}
