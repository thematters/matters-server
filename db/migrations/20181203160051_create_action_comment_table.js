const { baseDown } = require('../utils')

const table = 'action_comment'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').notNullable()
    t.enu('action', ['up_vote', 'down_vote'])
    t.bigInteger('target_id').notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['user_id', 'action', 'target_id'])

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
    t.foreign('target_id')
      .references('id')
      .inTable('comment')
  })
}

exports.down = baseDown(table)
