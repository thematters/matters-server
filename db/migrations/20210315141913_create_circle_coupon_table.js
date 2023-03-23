import { baseDown } from '../utils.js'

const table = 'circle_coupon'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('circle_id').unsigned().notNullable()
    t.integer('duration_in_months').defaultTo(1)
    t.string('provider_coupon_id').notNullable().unique()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // index
    t.index(['circle_id'])

    // reference
    t.foreign('circle_id').references('id').inTable('circle')
  })
}

export const down = baseDown(table)
