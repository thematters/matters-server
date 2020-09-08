const table = 'oauth_authorization_code'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('scope', 'text ARRAY').alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.text('scope').alter()
  })
}
