const { baseDown } = require('../utils')

const table = 'action_journal'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('action', ['like']).notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('user_id').references('id').inTable('user')
    t.foreign('target_id').references('id').inTable('journal')

    t.unique(['user_id', 'target_id', 'action'])
  })
}

exports.down = baseDown(table)
