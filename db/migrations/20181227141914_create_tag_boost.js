const { baseDown } = require('../utils')

const table = 'tag_boost'

exports.up = async knex => {
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('tag_id').unsigned()
    t.float('boost').defaultTo(1)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('tag_id')
      .references('id')
      .inTable('tag')
  })
}

exports.down = baseDown(table)
