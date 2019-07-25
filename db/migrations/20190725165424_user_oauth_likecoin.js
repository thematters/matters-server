const {
  baseDown
} = require('../utils')

const table = 'user_oauth_likecoin'

exports.up = async knex => {
  await knex('entity_type').insert({
    table
  })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.string('liker_id').unique().notNullable()
    t.enu('account_type', ['temporal', 'general'])
      .notNullable()
      .defaultTo('temporal')
    t.string('access_token')
      .notNullable()
    t.string('refresh_token')
    t.timestamp('expires')
    t.text('scope')

    // Setup foreign key
    t.foreign('liker_id')
      .references('liker_id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
