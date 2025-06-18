import { alterEnumString } from '../utils.js'

const table = 'user_feature_flag'

export const up = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'type', [
      'bypassSpamDetection',
      'unlimitedArticleFetch',
    ])
  )
}

export const down = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', ['bypassSpamDetection']))
}
