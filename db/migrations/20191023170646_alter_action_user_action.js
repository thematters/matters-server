import { alterEnumString } from '../utils.js'

const table = 'action_user'

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'action', ['follow', 'rate', 'block']))
}

export const down = async (knex) => {
  await knex.raw(alterEnumString(table, 'action', ['follow', 'rate']))
}
