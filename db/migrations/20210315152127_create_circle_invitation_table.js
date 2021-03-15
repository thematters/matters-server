const { baseDown } = require('../utils')

const table = 'circle_invitation'

exports.up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('invitee').unsigned().notNullable()
    t.bigInteger('inviter').unsigned().notNullable()
    t.bigInteger('circle_id').unsigned().notNullable()

    t.integer('period').defaultTo(1)
    t.boolean('accepted').defaultTo(false)

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('sent_at').defaultTo(knex.fn.now())
    t.timestamp('accepted_at')

    // index
    t.index(['inviter', 'circle_id'])

    // reference
    t.foreign('invitee').references('id').inTable('user')
    t.foreign('inviter').references('id').inTable('user')
    t.foreign('circle_id').references('id').inTable('circle')
  })
}

exports.down = baseDown(table)
