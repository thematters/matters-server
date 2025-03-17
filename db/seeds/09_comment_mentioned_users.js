const table = 'comment_mentioned_user'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          user_id: 2,
          comment_id: 1,
        },
        {
          user_id: 1,
          comment_id: 2,
        },
      ])
    })
}
