const { baseDown } = require('../utils')

const table = 'tag_translation'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('tag_id').unsigned().unique()
    t.string('language').notNullable()
    t.string('content').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // reference
    t.foreign('tag_id').references('id').inTable('tag')
  })
}

exports.down = baseDown(table)
