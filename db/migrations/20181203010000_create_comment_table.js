const { baseDown } = require('../utils')

const table = 'comment'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
      .notNullable()
      .unique()
    t.bigInteger('author_id').notNullable()
    t.bigInteger('article_id').notNullable()
    t.bigInteger('parent_comment_id')
    t.specificType('mentioned_user_id', 'bigint ARRAY')
    t.text('content')
    t.boolean('archived').defaultTo(false)
    t.boolean('pinned').defaultTo(false)
    t.boolean('has_citation').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('author_id')
      .references('id')
      .inTable('user')
    t.foreign('article_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = baseDown(table)
