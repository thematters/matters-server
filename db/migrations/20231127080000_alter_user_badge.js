import { alterEnumString } from '../utils.js'

const table = 'user_badge'
const newColumn = 'extra' // use jsonb for book-keeping some more features

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb(newColumn)
  })

  await knex.raw(
    alterEnumString(table, 'type', [
      'seed',
      'golden_motor',
      'architect',
      'nomad',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', ['seed', 'golden_motor', 'architect'])
  )

  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
