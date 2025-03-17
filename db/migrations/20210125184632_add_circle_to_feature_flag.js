import { alterEnumString } from '../utils.js'

const table = 'feature_flag'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'flag', ['admin', 'off', 'on', 'seeding'])
  )
  await knex(table).insert({ name: 'circle_management', flag: 'seeding' })
  await knex(table).insert({ name: 'circle_interact', flag: 'on' })
}

export const down = async (knex) => {
  await knex(table).where('name', 'circle_management').del()
  await knex(table).where('name', 'circle_interact').del()
  await knex.raw(alterEnumString(table, 'flag', ['admin', 'off', 'on']))
}
