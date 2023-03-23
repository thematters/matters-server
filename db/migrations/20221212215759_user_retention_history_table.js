import { baseDown } from '../utils.js'

const table = 'user_retention_history'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('state', ['NEWUSER', 'ALERT', 'INACTIVE', 'NORMAL', 'ACTIVE'])
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
