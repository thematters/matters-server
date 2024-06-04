const { baseDown } = require('../utils')

const table = 'journal_asset'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('journal_id').unsigned().notNullable()
    t.bigInteger('asset_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('journal_id').references('id').inTable('journal')
    t.foreign('asset_id').references('id').inTable('asset')

    t.index('journal_id')
    t.index('asset_id')
    t.index('created_at')
  })
}

exports.down = baseDown(table)
