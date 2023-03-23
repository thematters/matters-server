import { baseDown } from '../utils.js'

const table = 'notice_actor'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.bigInteger('actor_id').unsigned().notNullable()
    t.bigInteger('notice_id').unsigned().notNullable()

    t.unique(['actor_id', 'notice_id'])

    // Set foreign key
    t.foreign('actor_id').references('id').inTable('user')
    t.foreign('notice_id').references('id').inTable('notice')
  })
}

export const down = baseDown(table)
