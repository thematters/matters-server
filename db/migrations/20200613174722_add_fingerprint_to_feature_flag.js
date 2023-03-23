const table = 'feature_flag'

export const up = async (knex) => {
  await knex(table).insert({ name: 'fingerprint', flag: 'off' })
}

export const down = async (knex) => {
  await knex(table).where('name', 'fingerprint').del()
}
