const { baseDown } = require('../utils')

const table = 'moment'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('short_hash').unique().notNullable()
    t.bigInteger('author_id').unsigned().notNullable()
    t.text('content').notNullable()
    t.enu('state', ['active', 'archived']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('author_id').references('id').inTable('user')

    t.index('author_id')
    t.index('created_at')
  })
}

exports.down = baseDown(table)
