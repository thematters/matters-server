const { alterEnumString } = require('../utils')

const table = 'feature_flag'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'flag', ['admin', 'off', 'on', 'seeding'])
  )
  await knex(table).insert({ name: 'circle_management', flag: 'seeding' })
  await knex(table).insert({ name: 'circle_interact', flag: 'on' })
}

exports.down = async (knex) => {
  await knex(table).where('name', 'circle_management').del()
  await knex(table).where('name', 'circle_interact').del()
  await knex.raw(alterEnumString(table, 'flag', ['admin', 'off', 'on']))
}
