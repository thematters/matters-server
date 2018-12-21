const table = 'verification_code'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          code: '1234',
          type: 'register',
          user_id: '1',
          email: 'test1@matters.news'
        },
        {
          code: '2345',
          type: 'email_reset',
          email: 'test2@matters.news',
          status: 'used'
        }
      ])
    })
}
