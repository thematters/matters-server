import { baseDown } from '../utils.js'

const table = 'article_topic'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('topic_id').unsigned()
    t.bigInteger('article_id').unsigned()
    t.integer('order').defaultTo(0)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index('topic_id')

    // reference
    t.foreign('topic_id').references('id').inTable('topic')
    t.foreign('article_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
