import { baseDown } from '../utils.js'

const table = 'blockchain_sync_record'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('chain_id').notNullable()
    t.string('contract_address').notNullable()
    t.bigInteger('block_number').notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.unique(['chain_id', 'contract_address'])
  })
}

export const down = baseDown(table)
