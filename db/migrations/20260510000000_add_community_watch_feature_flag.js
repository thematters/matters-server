import { alterEnumString } from '../utils.js'

const table = 'user_feature_flag'
const uniqueIndex = 'user_feature_flag_user_id_type_unique'

const featureFlags = [
  'bypassSpamDetection',
  'unlimitedArticleFetch',
  'readSpamStatus',
  'communityWatch',
]

const previousFeatureFlags = [
  'bypassSpamDetection',
  'unlimitedArticleFetch',
  'readSpamStatus',
]

export const up = async (knex) => {
  await knex.raw(alterEnumString(table, 'type', featureFlags))

  await knex.raw(`
    DELETE FROM ${table} newer
    USING ${table} older
    WHERE newer.user_id = older.user_id
      AND newer.type = older.type
      AND newer.id > older.id
  `)

  await knex.schema.alterTable(table, (t) => {
    t.unique(['user_id', 'type'], uniqueIndex)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique(['user_id', 'type'], uniqueIndex)
  })

  await knex(table).where({ type: 'communityWatch' }).del()
  await knex.raw(alterEnumString(table, 'type', previousFeatureFlags))
}
