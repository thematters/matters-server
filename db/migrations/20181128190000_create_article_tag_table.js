import { baseDown } from '../utils.js'

const table = 'article_tag'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id')
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('tag_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id').references('id').inTable('article')
    t.foreign('tag_id').references('id').inTable('tag')
  })
}

export const down = baseDown(table)
