const table = 'user_oauth'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('token', 'access_token')
    t.string('refresh_token').notNullable()
    t.enu('provider', ['facebook', 'google', 'medium']).notNullable()
    t.dropColumn('type')
    t.dropColumn('status')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('access_token', 'token')
    t.dropColumn('refresh_token')
    t.dropColumn('provider')
    t.string('type').notNullable()
    t.string('status').notNullable()
  })
}
