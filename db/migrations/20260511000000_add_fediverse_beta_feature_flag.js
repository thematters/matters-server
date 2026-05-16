import { alterEnumString } from '../utils.js'

const table = 'user_feature_flag'

const featureFlags = [
  'bypassSpamDetection',
  'unlimitedArticleFetch',
  'readSpamStatus',
  'communityWatch',
  'fediverseBeta',
]

const previousFeatureFlags = [
  'bypassSpamDetection',
  'unlimitedArticleFetch',
  'readSpamStatus',
  'communityWatch',
]

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', featureFlags))
}

export const down = async (knex) => {
  await knex(table).where({ type: 'fediverseBeta' }).del()
  await knex.raw(alterEnumString(table, 'type', previousFeatureFlags))
}
