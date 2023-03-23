import { baseDown } from '../utils.js'

const table = 'username_edit_history'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.string('previous').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
