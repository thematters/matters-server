const table = 'asset'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          type: 'avatar',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          type: 'avatar',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          type: 'avatar',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          author_id: '1',
          type: 'embed',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          author_id: '2',
          type: 'cover',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000006',
          author_id: '3',
          type: 'cover',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000007',
          author_id: '1',
          type: 'audioDraft',
          path: 'path/to/file.mp3',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000008',
          author_id: '2',
          type: 'audioDraft',
          path: 'path/to/file.mp3',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000009',
          author_id: '3',
          type: 'audioDraft',
          path: 'path/to/file.mp3',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000010',
          author_id: '2',
          type: 'feedback',
          path: 'path/to/file.jpg',
        },
        {
          uuid: '00000000-0000-0000-0000-000000000011',
          author_id: '3',
          type: 'report',
          path: 'path/to/file.jpg',
        },
      ])
    })
}
