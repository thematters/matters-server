const { baseDown } = require('../utils')

const table = 'matters_choice_topic'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('title').notNullable()
    t.string('note')
    t.specificType('articles', 'bigint ARRAY')
    t.integer('pin_amount').unsigned().notNullable()
    t.enum('state', ['published', 'editing', 'archived']).notNullable()
    t.timestamp('published_at')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.index('state')
  })
}

exports.down = baseDown(table)
