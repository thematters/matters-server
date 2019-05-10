const { baseDown } = require('../utils')

const table = 'log_record'

exports.up = async knex => {
  await knex('entity_type').insert({
    table
  })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable()
    t.string('type').notNullable()
    t.bigInteger('user_id').unsigned()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
