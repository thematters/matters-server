const table = 'oauth_client'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          user_id: 1,
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          redirect_uri: ['https://matters.news'],
          grant_types: ['authorization_code', 'refresh_token'],
          name: 'LikeCoin',
          website_url: 'https://like.co',
          scope: ['query:viewer:likerId'],
        },
      ])
    })
}
