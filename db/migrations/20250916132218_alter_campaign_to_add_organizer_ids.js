import { baseDown } from '../utils.js'

const table = 'campaign'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.specificType('organizer_ids', 'bigint ARRAY')
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('organizer_ids')
  })
}
