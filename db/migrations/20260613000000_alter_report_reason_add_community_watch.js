// The GraphQL `ReportReason` enum declares `community_watch_porn_ad` and
// `community_watch_spam_ad`, but the `report.reason` check constraint (added in
// 20231221154057_alter_report_add_reason) was never updated to allow them.
// submitReport inserts the raw reason, so submitting either value failed with
// `report_reason_check` violation. This realigns the DB constraint with the
// schema. communityWatchRemoveComment is unaffected (it inserts
// `illegal_advertising`).
const constraint = 'report_reason_check'
const withCommunityWatch = [
  'tort',
  'illegal_advertising',
  'discrimination_insult_hatred',
  'pornography_involving_minors',
  'other',
  'community_watch_porn_ad',
  'community_watch_spam_ad',
]
const original = [
  'tort',
  'illegal_advertising',
  'discrimination_insult_hatred',
  'pornography_involving_minors',
  'other',
]

const toCheck = (values) => values.map((v) => `'${v}'`).join(', ')

export const up = async (knex) => {
  await knex.raw(`ALTER TABLE report DROP CONSTRAINT IF EXISTS ${constraint}`)
  await knex.raw(
    `ALTER TABLE report ADD CONSTRAINT ${constraint} CHECK (reason IN (${toCheck(
      withCommunityWatch
    )}))`
  )
}

export const down = async (knex) => {
  await knex.raw(`ALTER TABLE report DROP CONSTRAINT IF EXISTS ${constraint}`)
  await knex.raw(
    `ALTER TABLE report ADD CONSTRAINT ${constraint} CHECK (reason IN (${toCheck(
      original
    )}))`
  )
}
