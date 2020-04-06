const { alterEnumString } = require('../utils')

const table = 'user'

exports.up = async knex => {
  await knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'frozen',
      'archived',
      'forbidden',
    ])
  )
}

exports.down = async knex => {
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
