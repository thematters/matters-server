// renamed from transaction

const table = 'appreciation'

exports.seed = function (knex, Promise) {
  // Deletes ALL existing entries
  return knex(table)
    .del()
    .then(function () {
      // Inserts seed entries
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          sender_id: 1,
          amount: 10,
          purpose: 'appreciate',
          reference_id: 1,
          recipient_id: 1,
          type: 'LIKE',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          sender_id: 1,
          amount: 10,
          purpose: 'appreciate',
          reference_id: 1,
          recipient_id: 1,
          type: 'LIKE',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          sender_id: 2,
          amount: 30,
          purpose: 'appreciate',
          reference_id: 1,
          recipient_id: 1,
          type: 'LIKE',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          sender_id: 2,
          amount: 10,
          purpose: 'appreciate',
          reference_id: 2,
          recipient_id: 2,
          type: 'LIKE',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          sender_id: 3,
          amount: 50,
          purpose: 'appreciate',
          reference_id: 3,
          recipient_id: 3,
          type: 'LIKE',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000006',
          sender_id: 3,
          amount: 100,
          purpose: 'appreciate',
          reference_id: 1,
          recipient_id: 1,
          type: 'LIKE',
        },
      ])
    })
}
