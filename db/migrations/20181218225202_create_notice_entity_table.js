const { baseDown } = require('../utils')

const table = 'notice_entity'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('type').notNullable()
    t.bigInteger('entity_type_id').unsigned().notNullable()
    t.bigInteger('entity_id').unsigned().notNullable()
    t.bigInteger('notice_id').unsigned().notNullable()

    t.unique(['type', 'entity_type_id', 'entity_id', 'notice_id'])

    // Set foreign key
    t.foreign('entity_type_id').references('id').inTable('entity_type')
    t.foreign('notice_id').references('id').inTable('notice')
  })
}

exports.down = baseDown(table)
