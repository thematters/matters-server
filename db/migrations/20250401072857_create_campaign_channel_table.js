import { baseDown } from '../utils.js'

const table = 'campaign_channel'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('campaign_id').notNullable()
    t.integer('order').notNullable().defaultTo(0)
    t.boolean('enabled').notNullable().defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.unique(['campaign_id'])
    t.foreign('campaign_id').references('id').inTable('campaign')
  })
}

export const down = baseDown(table)
