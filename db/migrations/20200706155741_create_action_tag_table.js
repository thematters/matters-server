import { baseDown } from '../utils.js'

const table = 'action_tag'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('action', ['follow']).notNullable()
    t.bigInteger('target_id').unsigned().notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['user_id', 'action', 'target_id'])

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
    t.foreign('target_id').references('id').inTable('tag')
  })
}

export const down = baseDown(table)
