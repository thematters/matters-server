const { baseDown } = require('../utils')

const topic_table = 'topic'
const article_topic_table = 'article_topic'

exports.up = async (knex) => {
  // Create topics table
  await knex('entity_type').insert({ table: topic_table })
  await knex.schema.createTable(topic_table, (t) => {
    t.bigIncrements('id').primary()
    t.string('name').notNullable()
    t.string('description')
    t.string('provider_id').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
  })

  // Create article_topic junction table
  await knex('entity_type').insert({ table: article_topic_table })
  await knex.schema.createTable(article_topic_table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.bigInteger('topic_id').unsigned().notNullable()

    t.boolean('is_labeled').nullable()
    t.float('score').nullable()

    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    t.foreign('article_id').references('id').inTable('article')
    t.foreign('topic_id').references('id').inTable('topic')

    t.unique(['article_id', 'topic_id'])
    t.index('article_id').index('topic_id').index('is_labeled').index('score')
  })
}

exports.down = async (knex) => {
  await baseDown(article_topic_table)(knex)
  await baseDown(topic_table)(knex)
}
