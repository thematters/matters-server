const table = 'spam_ring_event'
const constraint = 'spam_ring_event_action_check'

// #4879 renamed the per-member freeze event action 'member_banned' → 'member_frozen'
// in code, but the CHECK constraint created by t.enu() in the create-table migration
// still only allowed the original list — so every freezeSpamRing failed on the event
// insert with "violates check constraint spam_ring_event_action_check". Recreate the
// constraint with 'member_frozen' added (keep 'member_banned' for existing rows).
const ACTIONS = [
  'detected',
  'frozen',
  'unfrozen',
  'dismissed',
  'member_banned',
  'member_frozen',
  'member_skipped',
  'member_restored',
]

const setCheck = async (knex, actions) => {
  const list = actions.map((a) => `'${a}'`).join(', ')
  await knex.raw(
    `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`
  )
  await knex.raw(
    `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" CHECK (action IN (${list}))`
  )
}

export const up = async (knex) => {
  await setCheck(knex, ACTIONS)
}

export const down = async (knex) => {
  await setCheck(
    knex,
    ACTIONS.filter((a) => a !== 'member_frozen')
  )
}
