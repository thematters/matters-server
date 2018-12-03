const table = 'comment'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000011',
          author_id: 1,
          article_id: 1,
          text: 'Test comment'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000012',
          author_id: 2,
          article_id: 2,
          text: 'Test comment'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000013',
          author_id: 3,
          article_id: 3,
          text: 'Test comment'
        }
      ])
    })
}
