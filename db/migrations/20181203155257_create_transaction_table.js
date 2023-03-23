import { baseDown } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.uuid('uuid').notNullable()
    t.bigInteger('sender_id').unsigned()
    t.bigInteger('recipient_id').unsigned().notNullable()
    t.integer('amount').notNullable()
    t.enu('purpose', [
      'appreciate',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
      .notNullable()
      .defaultTo('appreciate')
    t.bigInteger('reference_id')
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('sender_id').references('id').inTable('user')
    t.foreign('recipient_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
