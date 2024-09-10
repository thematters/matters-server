const { baseDown } = require('../utils')

const table = 'article_classification'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_version_id')
    t.string('classification')

    t.foreign('article_version_id').references('id').inTable('article_version')

    t.index('article_version_id')
    t.index('classification')
  })
}

exports.down = baseDown(table)
