const table = 'user_oauth_likecoin'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.integer('pending_like')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('pending_like')
  })
}
