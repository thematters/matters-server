import { baseDown } from '../utils.js'

const table = 'payout_account'

export const up = async (knex) => {
  await knex('entity_type').insert({
    table,
  })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.enu('type', ['express', 'standard']).notNullable().defaultTo('express')
    t.string('account_id').notNullable().unique()

    t.unique(['provider', 'account_id', 'user_id'])

    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
