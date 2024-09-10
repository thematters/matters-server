const { baseDown } = require('../utils')

const table = 'article_content_classification'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('content_id')
    t.string('classification')

    t.foreign('content_id').references('id').inTable('article_content')

    t.index('content_id')
    t.index('classification')
  })
}

exports.down = baseDown(table)
