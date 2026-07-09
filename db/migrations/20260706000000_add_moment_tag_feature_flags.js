const table = 'feature_flag'
const names = ['moment_tag', 'moment_tag_display']

export const up = async (knex) => {
  await knex(table).insert(
    names.map((name) => ({ name, flag: 'on', value: null }))
  )
}

export const down = async (knex) => {
  await knex(table).whereIn('name', names).del()
}
