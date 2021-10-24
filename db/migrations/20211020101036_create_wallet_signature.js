const { baseDown } = require('../utils')

const table = 'crypto_wallet_signature'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('address').notNullable()
    t.string('signed_message').notNullable()
    t.text('signature').notNullable()
    t.enu('purpose', ['airdrop', 'connect']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index(['address', 'purpose'])
  })
}

exports.down = baseDown(table)
