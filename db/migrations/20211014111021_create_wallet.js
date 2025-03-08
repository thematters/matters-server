import { baseDown } from '../utils.js'

const table = 'crypto_wallet'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned()
    t.string('address').unique().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index('user_id')

    // reference
    t.foreign('user_id').references('id').inTable('user')
  })
}

export const down = baseDown(table)
