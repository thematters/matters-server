import { baseDown } from '../utils.js'

const table = 'article_read_count'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('count').notNullable()
    t.boolean('archived').defaultTo(false)
    t.string('ip')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
    t.foreign('article_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
