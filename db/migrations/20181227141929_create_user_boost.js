const { baseDown } = require('../utils')

const table = 'user_boost'

exports.up = async knex => {
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.float('boost').defaultTo(1)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
