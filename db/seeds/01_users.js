const bcrypt = require('bcrypt')
const BCRYPT_ROUNDS = 12

const table = 'user'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          user_name: 'test 1',
          display_name: 'test 1',
          description: 'test user 1 description',
          email: 'test1@matters.news',
          mobile: '999',
          mat: 99,
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS)
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          user_name: 'test 2',
          display_name: 'test 2',
          description: 'test user 2 description',
          email: 'test2@matters.news',
          mobile: '999',
          mat: 20,
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS),
          language: 'zh_hans'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          user_name: 'test 3',
          display_name: 'test 3',
          description: 'test user 3 description',
          email: 'test3@matters.news',
          mobile: '999',
          mat: 9,
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS),
          language: 'en'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          user_name: 'test 4',
          display_name: 'test 4',
          email: 'test4@matters.news',
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS)
        }
      ])
    })
}
