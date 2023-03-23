import { alterEnumString } from '../utils.js'

const table = 'comment'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', [
      'active',
      'archived',
      'banned',
      'collapsed',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', ['active', 'archived', 'banned'])
  )
}
