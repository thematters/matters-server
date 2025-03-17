import { baseDown } from '../utils.js'

const table = 'comment'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('author_id').unsigned().notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('parent_comment_id').unsigned()
    t.text('content')
    t.enu('state', ['active', 'archived', 'banned'])
      .notNullable()
      .defaultTo('active')
    t.boolean('pinned').defaultTo(false)
    t.boolean('quote').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('author_id').references('id').inTable('user')
    t.foreign('article_id').references('id').inTable('article')
    t.foreign('parent_comment_id').references('id').inTable('comment')
  })
}

export const down = baseDown(table)
