const { baseDown } = require('../utils')

const table = 'announcement_translation'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('announcement_id').unsigned()
    t.string('language').notNullable()
    t.string('title')
    t.bigInteger('cover').unsigned()
    t.string('content', 2047)
    t.string('link')
    // t.enu('type', ['community', 'product', 'seminar']).notNullable() // re-use from the main 'announcement' table
    // t.boolean('visible').defaultTo(false)
    // t.integer('order').defaultTo(0)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.unique(['announcement_id', 'language'])

    // reference
    t.foreign('announcement_id').references('id').inTable('announcement')
    t.foreign('cover').references('id').inTable('asset')
  })
}

exports.down = async (knex) => {
  await baseDown(table)(knex)
}
