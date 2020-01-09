const table = 'user_oauth'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.renameColumn('token', 'access_token')
    t.string('refresh_token').notNullable()
    t.enu('provider', ['facebook', 'google', 'medium']).notNullable()
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.renameColumn('access_token', 'token')
    t.dropColumn('refresh_token')
    t.dropColumn('provider')
  })
}
