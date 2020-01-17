const table = 'user_oauth'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.string('refresh_token')
      .nullable()
      .alter()
    t.text('scope')
    t.timestamp('expires')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.string('refresh_token')
      .notNullable()
      .alter()
    t.dropColumn('scope')
    t.dropColumn('expires')
  })
}
