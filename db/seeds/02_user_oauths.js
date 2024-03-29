const table = 'user_oauth'
const table_likecoin = 'user_oauth_likecoin'

exports.seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table_likecoin)
        .del()
        .then(function () {
          return knex(table_likecoin).insert([
            {
              liker_id: 'test_liker_id_1',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_2',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_3',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_4',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_5',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_6',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_7',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
            {
              liker_id: 'test_liker_id_8',
              account_type: 'general',
              access_token: '123123',
              refresh_token: '123123',
            },
          ])
        })
    })
}
