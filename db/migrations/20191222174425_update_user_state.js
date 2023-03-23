const table = 'user'

export const up = async (knex) =>
  await knex(table)
    .where({
      state: 'onboarding',
    })
    .update('state', 'active')

export const down = () => {}
