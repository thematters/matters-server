const table = 'user_oauth_likecoin'

exports.up = async knex => {
  await knex.schema.table(table, function (t) {
    t.specificType('scope', 'text ARRAY').alter()
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function (t) {
    t.text('scope').alter()
  })
}
