import { baseDown } from '../utils.js'

const curationChannelTable = 'curation_channel'
const curationChannelArticleTable = 'curation_channel_article'

export const up = async (knex) => {
  // Create curation_channel table
  await knex('entity_type').insert({ table: curationChannelTable })
  await knex.schema.createTable(curationChannelTable, (t) => {
    t.bigIncrements('id').primary()
    t.string('short_hash').notNullable().unique()
    t.string('name').notNullable()
    t.string('note')
    t.integer('pin_amount').notNullable()
    t.enu('color', [
      'gray',
      'brown',
      'orange',
      'yellow',
      'green',
      'purple',
      'pink',
      'red',
      'blue',
      'white',
      'black',
    ]).notNullable()
    t.specificType('active_period', 'tstzrange').notNullable()
    t.enu('state', ['editing', 'published', 'archived']).notNullable()
    t.integer('order').notNullable().defaultTo(0)
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })

  // Create curation_channel_article table
  await knex('entity_type').insert({ table: curationChannelArticleTable })
  await knex.schema.createTable(curationChannelArticleTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('channel_id')
      .notNullable()
      .references('id')
      .inTable(curationChannelTable)
    t.bigInteger('article_id').notNullable().references('id').inTable('article')
    t.boolean('pinned').notNullable().defaultTo(false)
    t.timestamp('pinned_at').nullable()
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    // Add unique constraint to prevent duplicate articles in same channel
    t.unique(['channel_id', 'article_id'])
  })
}

export const down = async (knex) => {
  await baseDown(curationChannelArticleTable)(knex)
  await baseDown(curationChannelTable)(knex)
}
