const { alterEnumString } = require('../utils')

const table = 'user'

exports.up = async (knex) => {
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

exports.down = async (knex) => {
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
