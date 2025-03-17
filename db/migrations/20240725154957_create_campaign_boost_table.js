import { baseDown } from '../utils.js'

const table = 'campaign_boost'

export const up = async (knex) => {
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('campaign_id').unsigned().notNullable()
    t.float('boost').defaultTo(1)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('campaign_id').references('id').inTable('campaign')
  })
}

export const down = baseDown(table)
