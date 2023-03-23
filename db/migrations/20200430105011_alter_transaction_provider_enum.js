import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'provider', ['stripe', 'likecoin']))
}

export const down = async (knex) => {
  await knex.raw(alterEnumString(table, 'provider', ['stripe']))
}
