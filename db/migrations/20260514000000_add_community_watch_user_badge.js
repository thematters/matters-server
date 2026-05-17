import { alterEnumString } from '../utils.js'

const table = 'user_badge'

const badgeTypes = [
  'seed',
  'golden_motor',
  'architect',
  'nomad',
  'grand_slam',
  'community_watch',
]

const previousBadgeTypes = [
  'seed',
  'golden_motor',
  'architect',
  'nomad',
  'grand_slam',
]

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', badgeTypes))
}

export const down = async (knex) => {
  await knex(table).where({ type: 'community_watch' }).del()
  await knex.raw(alterEnumString(table, 'type', previousBadgeTypes))
}
