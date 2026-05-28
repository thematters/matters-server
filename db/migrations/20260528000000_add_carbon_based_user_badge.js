import { alterEnumString } from '../utils.js'

const table = 'user_badge'

const previousBadgeTypes = [
  'seed',
  'golden_motor',
  'architect',
  'nomad',
  'grand_slam',
  'community_watch',
]

const badgeTypes = [...previousBadgeTypes, 'carbon_based']

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', badgeTypes))
}

export const down = async (knex) => {
  await knex(table).where({ type: 'carbon_based' }).del()
  await knex.raw(alterEnumString(table, 'type', previousBadgeTypes))
}
