const table = 'feature_flag'

export const up = async (knex) => {
  await knex(table).insert({ name: 'tag_adoption', flag: 'admin' })
}

export const down = async (knex) => {
  await knex(table).where('name', 'tag_adoption').del()
}
