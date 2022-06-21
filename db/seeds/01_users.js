const bcrypt = require('bcrypt')
const BCRYPT_ROUNDS = 12

const table = 'user'

exports.seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          user_name: 'test1',
          display_name: 'test1',
          description: 'test user 1 description',
          email: 'test1@matters.news',
          email_verified: true,
          state: 'active',
          mobile: '999',
          liker_id: 'test_liker_id',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          eth_address: '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          user_name: 'test2',
          display_name: 'test2',
          description: 'test user 2 description',
          email: 'test2@matters.news',
          mobile: '999',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          language: 'zh_hans',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          user_name: 'test3',
          display_name: 'test3',
          description: 'test user 3 description',
          email: 'test3@matters.news',
          mobile: '999',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          language: 'en',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          user_name: 'test4',
          display_name: 'test4',
          email: 'test4@matters.news',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          state: 'onboarding',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          user_name: 'admin1',
          display_name: 'admin1',
          email: 'admin1@matters.news',
          role: 'admin',
          state: 'active',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          payment_password_hash: bcrypt.hashSync('123456', BCRYPT_ROUNDS),
        },
        {
          uuid: '00000000-0000-0000-0000-000000000006',
          user_name: 'matty',
          display_name: 'matty',
          email: 'hi@matters.news',
          role: 'admin',
          state: 'active',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
        },
        {
          uuid: '00000000-0000-0000-0000-000000000007',
          user_name: 'onboarding',
          display_name: 'onboarding_user',
          email: 'onboarding@matters.news',
          role: 'user',
          state: 'onboarding',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
        },
        {
          uuid: '00000000-0000-0000-0000-000000000008',
          user_name: 'frozen',
          display_name: 'frozen_user',
          email: 'frozen@matters.news',
          role: 'user',
          state: 'active',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
        },
        {
          uuid: '00000000-0000-0000-0000-000000000009',
          user_name: 'test9',
          display_name: 'test9',
          email: 'test9@matters.news',
          password_hash: bcrypt.hashSync('12345678', BCRYPT_ROUNDS),
          state: 'active',
        },
      ])
    })
}
