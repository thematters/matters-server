import { baseDown } from '../utils.js'

const table = 'blockchain_curation_event'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('amount')
  })
  await knex.schema.alterTable(table, (t) => {
    t.decimal('amount', 78, 0).notNullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('amount')
  })
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('amount').unsigned().notNullable()
  })
}
