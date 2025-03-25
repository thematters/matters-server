import { baseDown } from '../utils.js'

const table = 'moment_asset'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('moment_id').unsigned().notNullable()
    t.bigInteger('asset_id').unsigned().notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('moment_id').references('id').inTable('moment')
    t.foreign('asset_id').references('id').inTable('asset')

    t.index('moment_id')
    t.index('asset_id')
    t.index('created_at')
  })
}

export const down = baseDown(table)
