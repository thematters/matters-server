const table = 'audio_draft'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          s3_path: 'S3 path'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          s3_path: 'S3 path'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          s3_path: 'S3 path'
        }
      ])
    })
}
