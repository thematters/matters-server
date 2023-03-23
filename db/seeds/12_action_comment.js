const table = 'action_comment'

export const seed = function (knex, Promise) {
  // Deletes ALL existing entries
  return knex(table)
    .del()
    .then(function () {
      // Inserts seed entries
      return knex(table).insert([
        { user_id: 1, action: 'up_vote', target_id: 1 },
        { user_id: 2, action: 'down_vote', target_id: 1 },
        { user_id: 3, action: 'up_vote', target_id: 2 },
        { user_id: 3, action: 'up_vote', target_id: 1 },
      ])
    })
}
