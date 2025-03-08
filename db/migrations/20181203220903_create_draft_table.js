import { baseDown } from '../utils.js'

const table = 'draft'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable().unique()
    t.bigInteger('author_id').unsigned().notNullable()
    t.bigInteger('upstream_id').unsigned()
    t.string('title').notNullable()
    t.bigInteger('cover').unsigned()
    t.string('summary').notNullable()
    t.text('content').notNullable()
    t.boolean('archived').defaultTo(false)
    t.enu('publish_state', ['unpublished', 'pending', 'published', 'error'])
      .notNullable()
      .defaultTo('unpublished')
    t.specificType('tags', 'text ARRAY')
    t.timestamp('scheduled_at')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Set foreign key
    t.foreign('author_id').references('id').inTable('user')
    t.foreign('upstream_id').references('id').inTable('article')
  })
}

export const down = baseDown(table)
