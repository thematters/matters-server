const { baseDown } = require('../utils')

const table = 'blocklist'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable()
    t.enu('type', ['agent_hash', 'email']).notNullable()
    t.string('value').notNullable()
    t.boolean('archived').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

exports.down = baseDown(table)
