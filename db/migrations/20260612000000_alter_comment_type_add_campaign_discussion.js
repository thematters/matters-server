import { alterEnumString } from '../utils.js'

const table = 'comment'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'article',
      'circle_discussion',
      'circle_broadcast',
      'moment',
      'campaign_discussion',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'article',
      'circle_discussion',
      'circle_broadcast',
      'moment',
    ])
  )
}
