import { baseDown } from '../utils.js'

const table = 'article_translation'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().unique()
    t.string('language').notNullable()
    t.string('title').notNullable()
    t.text('content').notNullable()
    t.string('summary').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // reference
    t.foreign('article_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
