const { baseDown } = require('../utils')

const table = 'article'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
    t.bigInteger('author_id')
      .unsigned()
      .notNullable()
    t.bigInteger('upstream_id').unsigned()
    t.string('title').notNullable()
    t.string('cover').notNullable()
    t.string('abstract').notNullable()
    t.integer('word_count').notNullable()
    t.string('hash')
    t.text('content').notNullable()
    t.enu('publish_state', [
      'archived',
      'pending',
      'error',
      'published'
    ]).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('author_id')
      .references('id')
      .inTable('user')
    t.foreign('upstream_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = baseDown(table)
