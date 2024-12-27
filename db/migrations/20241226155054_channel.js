const { baseDown } = require('../utils')

const channel_table = 'channel'
const article_channel_table = 'article_channel'

exports.up = async (knex) => {
  // Create channel table
  await knex('entity_type').insert({ table: channel_table })
  await knex.schema.createTable(channel_table, (t) => {
    t.bigIncrements('id').primary()
    t.string('name').notNullable()
    t.string('description')
    t.string('provider_id').notNullable().unique()
    t.boolean('enabled').defaultTo(true).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.index('provider_id').index('enabled')
  })

  // Create article_channel junction table
  await knex('entity_type').insert({ table: article_channel_table })
  await knex.schema.createTable(article_channel_table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('channel_id').unsigned().notNullable()

    t.float('score').nullable()

    // admin fields
    t.boolean('enabled').defaultTo(true).notNullable()
    t.boolean('is_labeled').defaultTo(false).notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.foreign('article_id').references('id').inTable('article')
    t.foreign('channel_id').references('id').inTable('channel')

    t.unique(['article_id', 'channel_id'])
    t.index('article_id')
      .index('channel_id')
      .index('score')
      .index('is_labeled')
      .index('enabled')
  })
}

exports.down = async (knex) => {
  await baseDown(article_channel_table)(knex)
  await baseDown(channel_table)(knex)
}
