const { baseDown } = require('../utils')

const table = 'user_ipns_keys'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().unique()
    t.string('ipns_key').unique().notNullable()
    t.string('priv_key_pem', 2047).notNullable() // some extra space for priv key in PEM format
    t.string('priv_key_name').notNullable()
    // t.string('pub_key').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.string('last_data_hash')
    t.timestamp('last_published') // .defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

exports.down = baseDown(table)
