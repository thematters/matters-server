const table = 'user_boost'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          user_id: 2,
          boost: 10,
        },
        {
          user_id: 1,
          boost: 0.1,
        },
      ])
    })
}
