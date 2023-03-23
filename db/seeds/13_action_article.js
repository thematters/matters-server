const table = 'action_article'

export const seed = function (knex, Promise) {
  // Deletes ALL existing entries
  return knex(table)
    .del()
    .then(function () {
      // Inserts seed entries
      return knex(table).insert([
        { user_id: 1, action: 'subscribe', target_id: 1 },
        { user_id: 1, action: 'subscribe', target_id: 2 },
        { user_id: 1, action: 'subscribe', target_id: 3 },
        { user_id: 2, action: 'subscribe', target_id: 2 },
        { user_id: 3, action: 'subscribe', target_id: 3 },
      ])
    })
}
