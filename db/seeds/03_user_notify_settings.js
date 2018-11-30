const table = 'user_notify_setting'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          user_id: 1,
          enable: true
        },
        {
          user_id: 2,
          enable: true
        },
        {
          user_id: 3,
          enable: true
        }
      ])
    })
}
