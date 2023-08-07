const { alterEnumString } = require('../utils')

const table = 'verification_code'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'email_reset_confirm',
      'password_reset',
      'payment_password_reset',
      'email_verify',
      'email_otp',
    ])
  )
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'email_reset_confirm',
      'password_reset',
      'payment_password_reset',
      'email_verify',
    ])
  )
}
