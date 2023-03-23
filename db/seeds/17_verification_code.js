import { v4 } from 'uuid'

const table = 'verification_code'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: v4(),
          code: '1234',
          type: 'register',
          user_id: '1',
          email: 'test1@matters.news',
        },
        {
          uuid: v4(),
          code: '2345',
          type: 'email_reset',
          email: 'test2@matters.news',
          status: 'used',
        },
      ])
    })
}
