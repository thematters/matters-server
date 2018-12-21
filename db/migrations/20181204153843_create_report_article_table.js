const { baseDown } = require('../utils')

const table = 'report_article'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').notNullable()
    t.bigInteger('article_id').notNullable()
    t.text('category').notNullable()
    t.text('description').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
    t.foreign('article_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = baseDown(table)
