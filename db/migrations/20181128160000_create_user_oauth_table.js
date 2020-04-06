const { baseDown } = require('../utils')

const table = 'user_oauth'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.string('type').notNullable()
    t.text('token')
    t.string('status').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

exports.down = baseDown(table)
