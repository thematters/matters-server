import { baseDown } from '../utils.js'

const table = 'article_recommend_setting'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').notNullable().unique()
    t.boolean('in_hottest').defaultTo(true)
    t.boolean('in_newest').defaultTo(true)

    // Setup foreign key
    t.foreign('article_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
