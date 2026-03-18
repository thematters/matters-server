import { alterEnumString } from '../utils.js'

const table = 'social_account'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['Google', 'Twitter', 'Facebook', 'Threads'])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['Google', 'Twitter', 'Facebook'])
  )
}
