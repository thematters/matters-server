const { alterEnumString } = require('../utils')

const table = 'article'

exports.up = async (knex) => {
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

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'state', ['active', 'archived', 'banned'])
  )
}
