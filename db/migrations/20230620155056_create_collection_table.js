const { baseDown } = require('../utils')

const table = 'collection'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.bigInteger('author_id').unsigned().notNullable()
    t.string('title').notNullable()
    t.bigInteger('cover').unsigned()
    t.string('description').notNullable()
    t.boolean('pinned').defaultTo(false).notNullable()
    t.timestamp('pinned_at')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.index('created_at')
    t.index('updated_at')
    t.index('author_id')

    t.foreign('author_id').references('id').inTable('user')
    t.foreign('cover').references('id').inTable('asset')
  })
}

exports.down = baseDown(table)
