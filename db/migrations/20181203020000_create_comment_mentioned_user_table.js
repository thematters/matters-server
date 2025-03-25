import { baseDown } from '../utils.js'

const table = 'comment_mentioned_user'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('comment_id').unsigned().notNullable()
    t.bigInteger('user_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('comment_id').references('id').inTable('comment')
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
