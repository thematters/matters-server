import { baseDown } from '../utils.js'

const table = 'blocklist'

export const up = async (knex) => {
  // create table
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable()
    t.enu('type', ['agent_hash', 'email']).notNullable()
    t.string('value').notNullable()
    t.boolean('archived').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // composite unique key
    t.unique(['type', 'value'])
  })

  // add index
  await knex.schema.table(table, (t) => {
    t.index(['type', 'value', 'archived'])
  })
}

export const down = baseDown(table)
