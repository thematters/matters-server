import { baseDown } from '../utils.js'

const table = 'channel_announcement'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('announcement_id')
      .references('id')
      .inTable('announcement')
      .notNullable()
    t.bigInteger('channel_id')
      .references('id')
      .inTable('topic_channel')
      .notNullable()
    t.boolean('visible').notNullable().defaultTo(true)
    t.integer('order').notNullable().defaultTo(0)

    // Standard timestamp columns
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })

  // Add unique constraint to prevent duplicate announcements in the same channel
  await knex.schema.alterTable(table, (t) => {
    t.unique(['announcement_id', 'channel_id'])
  })
}

export const down = baseDown(table)
