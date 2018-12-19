const table = 'audio_draft'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          title: 'Audio 1',
          path: 'S3 path'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          title: 'Audio 2',
          path: 'S3 path'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          title: 'Audio 3',
          path: 'S3 path'
        }
      ])
    })
}
