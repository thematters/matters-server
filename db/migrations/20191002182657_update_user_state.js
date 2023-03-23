const table = 'user'

export const up = async (knex) =>
  await knex(table).update('state', 'onboarding')

export const down = () => {}
