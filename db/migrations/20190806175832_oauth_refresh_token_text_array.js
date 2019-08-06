const table = 'oauth_refresh_token'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.specificType('scope', 'text ARRAY').alter()
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.text('scope').alter()
  })
}
