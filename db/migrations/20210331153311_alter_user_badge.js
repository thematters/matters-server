import { alterEnumString } from '../utils.js'

const table = 'user_badge'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['seed', 'golden_motor', 'architect'])
  )
}

export const down = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', ['seed']))
}
