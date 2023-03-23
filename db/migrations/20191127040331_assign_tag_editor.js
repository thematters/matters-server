const table = 'tag'

export const up = async (knex) => {
  const user = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (user) {
    await knex(table).update({ editors: [user.id] })
  }
}

export const down = async (knex) => {
  await knex(table).update({ editors: null })
}
