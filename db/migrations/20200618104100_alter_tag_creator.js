const table = 'tag'

exports.up = async (knex) => {
  const user = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  await knex.schema.table(table, function (t) {
    t.bigInteger('creator').unsigned().notNullable().defaultTo(user.id)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('creator')
  })
}
