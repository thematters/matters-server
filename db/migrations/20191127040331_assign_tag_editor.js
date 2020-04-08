const table = 'tag'

exports.up = async (knex) => {
  const user = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (user) {
    await knex(table).update({ editors: [user.id] })
  }
}

exports.down = async (knex) => {
  await knex(table).update({ editors: null })
}
