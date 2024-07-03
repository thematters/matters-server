const { baseDown } = require('../utils')

const table = 'translation'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('hash').notNullable()
    t.text('text').notNullable()
    t.enu('language', ['zh_hant', 'zh_hans', 'en']).notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
  })
}

exports.down = baseDown(table)
