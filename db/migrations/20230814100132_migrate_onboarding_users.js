const { alterEnumString } = require('../utils')

const table = 'user'

exports.up = async (knex) => {
  await knex('user').where({ state: 'onboarding' }).update({ state: 'active' })

  await knex.raw(`ALTER TABLE "user" ALTER COLUMN state SET DEFAULT 'active';`)
  await knex.raw(
    alterEnumString(table, 'state', ['active', 'banned', 'frozen', 'archived'])
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
  await knex.raw(
    `ALTER TABLE "user" ALTER COLUMN state SET DEFAULT 'onboarding';`
  )
}
