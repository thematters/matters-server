import { baseDown } from '../utils.js'

const table = 'asset_map'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('asset_id').unsigned().notNullable()
    t.bigInteger('entity_type_id').unsigned().notNullable()
    t.bigInteger('entity_id').unsigned().notNullable()

    t.unique(['asset_id', 'entity_type_id', 'entity_id'])

    // Set foreign key
    t.foreign('asset_id').references('id').inTable('asset')
    t.foreign('entity_type_id').references('id').inTable('entity_type')
  })
}

export const down = baseDown(table)
