import { baseDown } from '../utils.js'

const table = 'blockchain_curation_event'

export const up = async (knex) => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('blockchain_transaction_id').unsigned().notNullable().unique()
    t.string('contract_address').notNullable()
    t.string('curator_address').notNullable()
    t.string('creator_address').notNullable()
    t.string('token_address')
    t.bigInteger('amount').unsigned().notNullable()
    t.text('uri').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.index('contract_address')
    t.index('curator_address')
    t.index('creator_address')
    t.index('token_address')
    t.index('uri')

    t.foreign('blockchain_transaction_id')
      .references('id')
      .inTable('blockchain_transaction')
  })
}

export const down = baseDown(table)
