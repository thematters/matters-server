const { baseDown } = require('../utils')

const table = 'matters_choice_tag'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('tag_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('tag_id').references('id').inTable('tag')
  })
}

exports.down = baseDown(table)
