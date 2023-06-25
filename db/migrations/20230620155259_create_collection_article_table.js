const { baseDown } = require('../utils')

const table = 'collection_article'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('collection_id').unsigned().notNullable()
    t.bigInteger('article_id').unsigned().notNullable()
    t.decimal('order').notNullable()

    t.unique(['collection_id', 'article_id'])

    t.index('collection_id')
    t.index('article_id')
    t.index('order')

    t.foreign('collection_id').references('id').inTable('collection')
    t.foreign('article_id').references('id').inTable('article')
  })
}

exports.down = baseDown(table)
