exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('user')
    .del()
    .then(function() {
      // Inserts seed entries
      return knex('user').insert([
        {
          username: 'test 1',
          email: 'test1@matters.news',
          mobile: '999',
          password: '123',
          avatar: 'some-s3-url',
          description: 'test user 1'
        },
        {
          username: 'test 2',
          email: 'test2@matters.news',
          mobile: '999',
          password: '123',
          avatar: 'some-s3-url',
          description: 'test user 2'
        },
        {
          username: 'test 3',
          email: 'test3@matters.news',
          mobile: '999',
          password: '123',
          avatar: 'some-s3-url',
          description: 'test user 3'
        }
      ])
    })
}
