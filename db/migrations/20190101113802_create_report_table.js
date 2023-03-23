import { baseDown } from '../utils.js'

const table = 'report'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id')
    t.bigInteger('article_id')
    t.bigInteger('comment_id')
    t.string('category').notNullable()
    t.text('description')
    t.string('contact')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
    t.foreign('article_id').references('id').inTable('article')
    t.foreign('comment_id').references('id').inTable('comment')
  })
}

export const down = baseDown(table)
