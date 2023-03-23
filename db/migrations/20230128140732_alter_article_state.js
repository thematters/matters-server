import { alterEnumString } from '../utils.js'

const table = 'article'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', [
      'active',
      'archived',
      'banned',
      'pending',
      'error',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', ['active', 'archived', 'banned'])
  )
}
