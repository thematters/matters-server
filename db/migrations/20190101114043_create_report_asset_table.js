import { baseDown } from '../utils.js'

const table = 'report_asset'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('report_id').unsigned().notNullable()
    t.bigInteger('asset_id').unsigned().notNullable()

    t.unique(['report_id', 'asset_id'])

    t.foreign('report_id').references('id').inTable('report')
    t.foreign('asset_id').references('id').inTable('asset')
  })
}

export const down = baseDown(table)
