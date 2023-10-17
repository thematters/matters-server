const { baseDown } = require('../utils')

const table = 'social_account'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('type', ['Google', 'Twitter', 'Facebook']).notNullable()
    t.string('provider_account_id').notNullable()
    t.string('user_name')
    t.string('email')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.index('user_id')
    t.unique(['type', 'user_id'])
    t.unique(['type', 'provider_account_id'])

    t.foreign('user_id').references('id').inTable('user')
  })
}

exports.down = baseDown(table)
