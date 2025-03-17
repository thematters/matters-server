const table = 'oauth_refresh_token'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('scope', 'text ARRAY').alter()
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.text('scope').alter()
  })
}
