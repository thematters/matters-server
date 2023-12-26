const table = 'article'

exports.seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: 1,
          draft_id: 1,
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: 2,
          draft_id: 2,
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: 3,
          draft_id: 3,
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: 1,
          draft_id: 4,
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          author_id: 7,
          draft_id: 5,
          state: 'active',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: 1,
          draft_id: 6,
          state: 'active',
        },
      ])
    })
}
