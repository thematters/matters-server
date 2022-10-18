const { baseDown } = require('../utils')

const table = 'blockchain_transaction'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('transaction_id').unsigned()
    t.bigInteger('chain_id').notNullable()
    t.string('tx_hash').notNullable()
    t.enu('state', ['pending', 'succeeded', 'reverted', 'timeout', 'canceled'])
      .notNullable()
      .defaultTo('pending')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('udpated_at').defaultTo(knex.fn.now())

    t.unique(['chain_id', 'tx_hash'])

    t.index('chain_id')
    t.index('tx_hash')
    t.index('state')

    t.foreign('transaction_id').references('id').inTable('transaction')
  })
}

exports.down = baseDown(table)
