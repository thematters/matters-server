import { alterEnumString } from '../utils.js'

const table = 'user'

export const up = (knex) =>
  knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'frozen',
      'archived',
    ])
  )

export const down = (knex) =>
  knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'archived',
    ])
  )
