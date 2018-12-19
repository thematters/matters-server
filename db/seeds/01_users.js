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
          avatar: 'some-s3-url',
          email: 'test1@matters.news',
          mobile: '999',
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS)
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          user_name: 'test 2',
          display_name: 'test 2',
          description: 'test user 2 description',
          avatar: 'some-s3-url',
          email: 'test2@matters.news',
          mobile: '999',
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS),
          language: 'zh_hans'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          user_name: 'test 3',
          display_name: 'test 3',
          description: 'test user 3 description',
          avatar: 'some-s3-url',
          email: 'test3@matters.news',
          mobile: '999',
          password_hash: bcrypt.hashSync('123', BCRYPT_ROUNDS),
          language: 'en'
        }
      ])
    })
}
