const table = 'notice'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000000',
          notice_object_id: 1,
          recipient_id: 1
        },
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          notice_object_id: 2,
          recipient_id: 1
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          notice_object_id: 3,
          recipient_id: 1
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          notice_object_id: 4,
          recipient_id: 2
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          notice_object_id: 5,
          recipient_id: 1
        }
      ])
    })
}
