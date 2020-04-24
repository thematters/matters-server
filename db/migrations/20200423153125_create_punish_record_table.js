const { baseDown } = require('../utils')

const table = 'punish_record'

exports.up = async (knex) => {
  // create table
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.enu('state', ['banned']).notNullable()
    t.timestamp('expired_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // setup foreign key
    t.foreign('user_id').references('id').inTable('user')

    // composite unique key
    t.unique(['user_id', 'state'])
  })

  // add index
  await knex.schema.table(table, (t) => {
    t.index(['state'])
    t.index(['user_id', 'state'])
  })
}

exports.down = baseDown(table)
