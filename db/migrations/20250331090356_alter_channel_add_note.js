import { baseDown } from '../utils.js'

const table = 'channel'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('note').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('note')
  })
}
