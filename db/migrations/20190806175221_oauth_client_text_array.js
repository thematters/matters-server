const table = 'oauth_client'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('redirect_uri', 'text ARRAY').alter()
    t.specificType('grant_types', 'text ARRAY').alter()
    t.specificType('scope', 'text ARRAY').alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.text('scope').alter()
    t.string('grant_types').alter()
    t.text('redirect_uri').alter()
  })
}
