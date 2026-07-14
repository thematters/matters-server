const table = 'feature_flag'
const name = 'discovery_spam_filter'

export const up = async (knex) => {
  await knex(table)
    .insert({ name, flag: 'on', value: 0.6 })
    .onConflict('name')
    .ignore()
}

export const down = async (knex) => {
  await knex(table).where({ name }).del()
}
