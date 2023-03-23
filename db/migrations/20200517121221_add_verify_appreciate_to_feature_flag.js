const table = 'feature_flag'

export const up = (knex) =>
  knex(table).insert({ name: 'verify_appreciate', enabled: true })

export const down = (knex) =>
  knex(table).where({ name: 'verify_appreciate' }).del()
