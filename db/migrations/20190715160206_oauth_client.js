const { baseDown } = require('../utils')

const table = 'oauth_client'

exports.up = async (knex) => {
  await knex('entity_type').insert({
    table,
  })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.string('client_id').notNullable().unique()
    t.string('client_secret')
    t.text('redirect_uri')
    t.string('grant_types')
    t.text('scope')
    t.bigInteger('user_id').unsigned().notNullable()

    // Setup foreign key
    t.foreign('user_id').references('id').inTable('user')
  })
}

exports.down = baseDown(table)
