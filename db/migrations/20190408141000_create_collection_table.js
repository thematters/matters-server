import { baseDown } from '../utils.js'

const table = 'collection'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('entrance_id').unsigned().notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.integer('order').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('entrance_id').references('id').inTable('article')
    t.foreign('article_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
