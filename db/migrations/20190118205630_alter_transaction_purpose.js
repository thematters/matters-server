import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'appreciate',
      'appreciate-comment',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'appreciate',
      'invitation-accepted',
      'join-by-invitation',
      'join-by-task',
      'first-post',
      'system-subsidy',
    ])
  )
}
