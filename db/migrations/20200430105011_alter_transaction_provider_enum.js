const { alterEnumString } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'provider', ['stripe', 'likecoin'])
  )
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'provider', ['stripe'])
  )
}
