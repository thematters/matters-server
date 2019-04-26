const { alterEnumString } = require('../utils')
const table = 'verification_code'

exports.up = async knex => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'email_reset_confirm',
      'password_reset',
      'email_verify'
    ])
  )
}

exports.down = async knex => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'register',
      'email_reset',
      'password_reset',
      'email_verify'
    ])
  )
}
