import { baseDown } from '../utils.js'

const table = 'topic_channel_feedback'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').references('id').inTable('article').notNullable()
    t.bigInteger('user_id').references('id').inTable('user').notNullable()
    t.jsonb('channel_ids')
    t.enu('type', ['positive', 'negative']).notNullable()
    t.enu('state', ['pending', 'accepted', 'rejected'])
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())

    // Add indexes
    t.unique(['article_id'])
    t.index(['user_id'])
    t.index(['state'])
  })
}

export const down = baseDown(table)
