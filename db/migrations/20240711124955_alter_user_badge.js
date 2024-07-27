const { alterEnumString } = require('../utils')

const table = 'user_badge'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'seed',
      'golden_motor',
      'architect',
      'nomad',
      'grand_slam',
    ])
  )
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'seed',
      'golden_motor',
      'architect',
      'nomad',
    ])
  )
}
