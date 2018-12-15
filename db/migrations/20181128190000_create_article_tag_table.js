const { baseDown } = require('../utils')

const table = 'article_tag'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements()
    t.bigInteger('article_id')
      .unsigned()
      .notNullable()
    t.string('tag').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = baseDown(table)
