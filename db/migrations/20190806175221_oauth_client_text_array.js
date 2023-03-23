const table = 'oauth_client'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('redirect_uri', 'text ARRAY').alter()
    t.specificType('grant_types', 'text ARRAY').alter()
    t.specificType('scope', 'text ARRAY').alter()
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.text('scope').alter()
    t.string('grant_types').alter()
    t.text('redirect_uri').alter()
  })
}
