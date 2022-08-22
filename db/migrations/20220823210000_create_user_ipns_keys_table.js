const { baseDown } = require('../utils')

const table = 'user_ipns_keys'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.foreign('user_id').references('id').inTable('user')
    t.string('ipns_address').unique().notNullable()
    t.string('priv_key').notNullable()
    t.string('pub_key').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('last_publication') // .defaultTo(knex.fn.now())
  })
}

exports.down = baseDown(table)
