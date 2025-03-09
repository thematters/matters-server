import { alterEnumString } from '../utils.js'

const table = 'action_tag'

export const up = async (knex) =>
  knex.raw(alterEnumString(table, 'action', ['follow', 'pin']))

export const down = (knex) =>
  knex.raw(alterEnumString(table, 'action', ['follow']))
