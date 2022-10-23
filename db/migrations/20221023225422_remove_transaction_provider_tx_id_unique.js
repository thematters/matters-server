const { baseDown } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique(['provider_tx_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.unique(['provider_tx_id'])
  })
}
