const table = 'user_oauth_likecoin'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.decimal('pending_like', 36, 18)
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('pending_like')
  })
}
