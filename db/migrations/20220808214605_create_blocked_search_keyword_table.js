const { baseDown } = require('../utils')

const table = 'blocked_search_keyword'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('search_key').unique().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // reference
    // t.foreign('search_key').references('search_key').inTable('search_history')
  })
}

exports.down = baseDown(table)
