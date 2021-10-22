const table = 'user_oauth'
const table_likecoin = 'user_oauth_likecoin'

exports.seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([])
    })
    .then(function () {
      return knex(table_likecoin)
        .del()
        .then(function () {
          return knex(table_likecoin).insert([
            {
              liker_id: 'test_liker_id',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
          ])
        })
    })
}
