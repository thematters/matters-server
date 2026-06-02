const table = 'feature_flag'
const name = 'hottest_moment_feed'

export const up = async (knex) => {
  await knex(table).insert({ name, flag: 'off', value: null })
}

export const down = async (knex) => {
  await knex(table).where({ name }).del()
}
