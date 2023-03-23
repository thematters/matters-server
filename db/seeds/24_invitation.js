const table = 'invitation'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        // system
        {
          recipient_id: '1',
          status: 'activated',
        },
        // invite a new user
        {
          sender_id: '1',
          email: 'newuser@test.com',
          status: 'pending',
        },
        // user 3 is activated by user 1
        {
          sender_id: '1',
          recipient_id: '3',
          status: 'activated',
        },
      ])
    })
}
