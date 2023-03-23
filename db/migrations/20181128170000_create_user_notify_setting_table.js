import { baseDown } from '../utils.js'

const table = 'user_notify_setting'

export const up = async (knex) => {
  await knex('entity_type').insert({
    table,
  })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.boolean('enable').notNullable().defaultTo(true)
    t.boolean('mention').notNullable().defaultTo(true)
    t.boolean('follow').notNullable().defaultTo(true)
    t.boolean('comment').notNullable().defaultTo(true)
    t.boolean('appreciation').notNullable().defaultTo(true)
    t.boolean('article_subscription').notNullable().defaultTo(false)
    t.boolean('comment_subscribed').notNullable().defaultTo(false)
    t.boolean('downstream').notNullable().defaultTo(true)
    t.boolean('comment_pinned').notNullable().defaultTo(true)
    t.boolean('comment_voted').notNullable().defaultTo(false)
    t.boolean('wallet_update').notNullable().defaultTo(false)
    t.boolean('official_notice').notNullable().defaultTo(true)
    t.boolean('report_feedback').notNullable().defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
