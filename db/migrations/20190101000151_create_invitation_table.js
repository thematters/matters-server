import { baseDown } from '../utils.js'

const table = 'invitation'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('sender_id') // null for system
    t.bigInteger('recipient_id') // null for unregistered user
    t.enu('status', ['pending', 'activated']).notNullable()
    t.string('email').unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['sender_id', 'recipient_id', 'email'])

    t.foreign('sender_id').references('id').inTable('user')
    t.foreign('recipient_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
