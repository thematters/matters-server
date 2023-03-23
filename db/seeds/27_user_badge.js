const table = 'user_badge'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          user_id: 1,
          type: 'seed',
        },
      ])
    })
}
