import { alterEnumString } from '../utils.js'
const table = 'verification_code'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'email_reset_confirm',
      'password_reset',
      'email_verify',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'password_reset',
      'email_verify',
    ])
  )
}
