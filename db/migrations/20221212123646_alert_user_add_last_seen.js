import { baseDown } from '../utils.js'

const table = 'user'
const column = 'last_seen'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(column) // default to NULL // .defaultTo(knex.fn.now())
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
}
