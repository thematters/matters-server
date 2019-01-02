const { baseDown } = require('../utils')

const table = 'feedback_asset'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('feedback_id')
      .unsigned()
      .notNullable()
    t.bigInteger('asset_id')
      .unsigned()
      .notNullable()

    t.unique(['feedback_id', 'asset_id'])

    t.foreign('feedback_id')
      .references('id')
      .inTable('feedback')
    t.foreign('asset_id')
      .references('id')
      .inTable('asset')
  })
}

exports.down = baseDown(table)
