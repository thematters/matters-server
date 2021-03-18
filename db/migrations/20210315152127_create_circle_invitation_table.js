const { baseDown } = require('../utils')

const table = 'circle_invitation'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.string('email')
    t.bigInteger('inviter').unsigned().notNullable()
    t.bigInteger('circle_id').unsigned().notNullable()
    t.boolean('accepted').defaultTo(false)

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('sent_at').defaultTo(knex.fn.now())
    t.timestamp('accepted_at')
    t.bigInteger('coupon_id').unsigned().notNullable()

    // index
    t.index('user_id')
    t.index('email')
    t.index(['inviter', 'circle_id'])

    // reference
    t.foreign('user_id').references('id').inTable('user')
    t.foreign('inviter').references('id').inTable('user')
    t.foreign('circle_id').references('id').inTable('circle')
    t.foreign('coupon_id').references('id').inTable('circle_coupon')
  })
}

exports.down = baseDown(table)
