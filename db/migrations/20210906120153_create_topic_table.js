import { baseDown } from '../utils.js'

const table = 'topic'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('title')
    t.text('description')
    t.bigInteger('cover').unsigned()
    t.bigInteger('user_id').unsigned()
    t.boolean('public').defaultTo(true)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index('user_id')
    t.index('public')

    // reference
    t.foreign('cover').references('id').inTable('asset')
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
