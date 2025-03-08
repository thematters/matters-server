import { baseDown } from '../utils.js'

const table = 'circle_invoice'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.bigInteger('transaction_id').unsigned().notNullable()
    t.bigInteger('subscription_id').unsigned().notNullable()
    t.enu('provider', ['stripe']).notNullable().defaultTo('stripe')
    t.string('provider_invoice_id').notNullable().unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index(['user_id', 'transaction_id', 'subscription_id'])

    // foreign keys
    t.foreign('user_id')
      .references('id')
      .inTable('user')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')

    t.foreign('transaction_id')
      .references('id')
      .inTable('transaction')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')

    t.foreign('subscription_id')
      .references('id')
      .inTable('circle_subscription')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
  })
}

export const down = baseDown(table)
