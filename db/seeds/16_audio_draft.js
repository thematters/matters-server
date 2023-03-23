const table = 'audio_draft'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          title: 'Audio 1',
          audio: '7',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          title: 'Audio 2',
          audio: '8',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          title: 'Audio 3',
          audio: '9',
        },
      ])
    })
}
