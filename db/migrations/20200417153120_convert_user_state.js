import { alterEnumString } from '../utils.js'

const table = 'user'

export const up = async (knex) => {
  await knex(table).where({ state: 'frozen' }).update({ state: 'banned' })
  await knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'archived',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'frozen',
      'archived',
    ])
  )
}
