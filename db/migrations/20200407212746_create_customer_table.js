import { baseDown } from '../utils.js'

const table = 'customer'

export const up = async (knex) => {
  await knex('entity_type').insert({
    table: table,
  })

  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('customer_id').notNullable().unique()
    t.bigInteger('user_id').unsigned().notNullable()

    t.unique(['provider', 'customer_id', 'user_id'])

    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
