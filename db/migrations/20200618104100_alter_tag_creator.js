const table = 'tag'

export const up = async (knex) => {
  const user = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  await knex.schema.table(table, function (t) {
    t.bigInteger('creator')
      .unsigned()
      .defaultTo(user ? user.id : null)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('creator')
  })
}
