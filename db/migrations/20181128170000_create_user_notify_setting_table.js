const { baseDown } = require('../utils')

const table = 'user_notify_setting'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id')
      .unsigned()
      .notNullable()
    t.boolean('enable').defaultTo(true)
    t.boolean('mention').defaultTo(true)
    t.boolean('follow').defaultTo(true)
    t.boolean('comment').defaultTo(true)
    t.boolean('appreciation').defaultTo(true)
    t.boolean('article_subscription').defaultTo(true)
    t.boolean('comment_subscribed').defaultTo(false)
    t.boolean('downstream').defaultTo(true)
    t.boolean('comment_pinned').defaultTo(true)
    t.boolean('comment_voted').defaultTo(false)
    t.boolean('wallet_update').defaultTo(false)
    t.boolean('official_notice').defaultTo(true)
    t.boolean('report_feedback').defaultTo(true)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
