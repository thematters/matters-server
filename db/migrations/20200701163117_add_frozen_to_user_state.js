const { alterEnumString } = require('../utils')

const table = 'user'

exports.up = (knex) =>
  knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'frozen',
      'archived',
    ])
  )

exports.down = (knex) =>
  knex.raw(
    alterEnumString(table, 'state', [
      'onboarding',
      'active',
      'banned',
      'archived',
    ])
  )
