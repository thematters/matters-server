const table = 'notice_actor'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          notice_id: 1,
          actor_id: 2
        },
        {
          notice_id: 2,
          actor_id: 1
        },
        {
          notice_id: 2,
          actor_id: 2
        },
        {
          notice_id: 3,
          actor_id: 2
        },
        {
          notice_id: 4,
          actor_id: 1
        }
      ])
    })
}
