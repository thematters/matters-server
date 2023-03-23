const oauthAuthorizationTable = 'oauth_authorization_code'
const oauthAccessTokenTable = 'oauth_access_token'
const oauthRefreshTokenTable = 'oauth_refresh_token'

export const up = async (knex) => {
  // fix & alter `oauth_authorization_code`
  await knex.raw(`
    UPDATE
      ${oauthAuthorizationTable}
    SET
      scope = '{query:viewer:likerId,query:viewer:info:email}'
    WHERE
      scope = 'query:viewer:likerId query:viewer:info:email'
  `)
  await knex.raw(`
    UPDATE
      ${oauthAuthorizationTable}
    SET
      scope = '{query:viewer:info:email}'
    WHERE
      scope = 'query:viewer:info:email'
  `)
  await knex.schema.table(oauthAuthorizationTable, function (t) {
    t.specificType('scope', 'text ARRAY').alter()
  })

  // fix `oauth_access_token`
  await knex.raw(`
    UPDATE
      ${oauthAccessTokenTable}
    SET
      scope = '{query:viewer:info:email}'
    WHERE
      scope = '{\"{\\"query:viewer:info:email\\"}\"}'
    `)

  // fix `oauth_refresh_token`
  await knex.raw(`
    UPDATE
      ${oauthRefreshTokenTable}
    SET
      scope = '{query:viewer:info:email}'
    WHERE
      scope = '{\"{\\"query:viewer:info:email\\"}\"}'
  `)
}

export const down = async (knex) => {
  await knex.schema.table(oauthAuthorizationTable, function (t) {
    t.text('scope').alter()
  })
}
