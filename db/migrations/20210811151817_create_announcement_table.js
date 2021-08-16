const { baseDown } = require('../utils')

const table = 'announcement'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('title')
    t.bigInteger('cover').unsigned()
    t.string('content')
    t.string('link')
    t.enu('type', ['community', 'product', 'seminar']).notNullable()
    t.boolean('visible').defaultTo(false)
    t.integer('order').defaultTo(0)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex.schema.alterTable(table, (t) => {
    t.foreign('cover').references('id').inTable('asset')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, function (t) {
    t.dropForeign('cover')
  })

  await baseDown(table)(knex)
}
