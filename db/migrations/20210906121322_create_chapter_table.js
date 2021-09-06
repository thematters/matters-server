const { baseDown } = require('../utils')

const table = 'chapter'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('title')
    t.text('description')
    t.bigInteger('topic_id').unsigned()
    t.integer('order').defaultTo(0)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index('topic_id')

    // reference
    t.foreign('topic_id').references('id').inTable('topic')
  })
}

exports.down = baseDown(table)
