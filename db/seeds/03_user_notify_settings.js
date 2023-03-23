const table = 'user_notify_setting'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          user_id: 1,
          enable: true,
        },
        {
          user_id: 2,
          enable: true,
        },
        {
          user_id: 3,
          enable: true,
        },
        {
          user_id: 4,
          enable: true,
        },
        {
          user_id: 5,
          enable: true,
        },
        {
          user_id: 6,
          enable: true,
        },
      ])
    })
}
