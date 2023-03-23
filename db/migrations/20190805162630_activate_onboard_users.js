export const up = async (knex) => {
  await knex('user').where({ state: 'onboarding' }).update({ state: 'active' })
}

export const down = () => {}
