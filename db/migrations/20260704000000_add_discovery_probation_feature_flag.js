const table = 'feature_flag'
const name = 'discovery_probation'

// Dark launch: flag defaults to `off`, so discovery feeds behave exactly as
// before. The row must exist for admins to toggle it via `setFeature`
// (kill-switch). Probation window defaults to env
// MATTERS_DISCOVERY_PROBATION_DAYS (3); `value` overrides it when set.
export const up = async (knex) => {
  await knex(table)
    .insert({ name, flag: 'off', value: null })
    .onConflict('name')
    .ignore()
}

export const down = async (knex) => {
  await knex(table).where({ name }).del()
}
