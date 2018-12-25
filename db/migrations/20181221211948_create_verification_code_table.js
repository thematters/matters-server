const { baseDown } = require('../utils')

const table = 'verification_code'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('expired_at')
    t.string('code').notNullable()
    t.enu('type', [
      'register',
      'email_reset',
      'password_reset',
      'email_verify'
    ]).notNullable()
    t.enu('status', ['active', 'inactive', 'expired', 'used'])
      .notNullable()
      .defaultTo('active')
    t.bigInteger('user_id')
    t.string('email')

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
