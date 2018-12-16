const { baseDown } = require('../utils')

const table = 'notice_object'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.string('notice_type').notNullable()
    t.bigInteger('entity_type_id').unsigned()
    t.bigInteger('entity_id').unsigned()
    t.string('message')
    t.json('data')

    // Set foreign key
    t.foreign('entity_type_id')
      .references('id')
      .inTable('entity_type')
  })
}

exports.down = baseDown(table)
