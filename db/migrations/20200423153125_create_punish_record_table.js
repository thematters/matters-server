import { baseDown } from '../utils.js'

const table = 'punish_record'

export const up = async (knex) => {
  // create table
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.enu('state', ['banned']).notNullable()
    t.boolean('archived').defaultTo(false)
    t.timestamp('expired_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })

  // add index
  await knex.schema.table(table, (t) => {
    t.index(['user_id', 'state', 'archived'])
  })
}

export const down = baseDown(table)
