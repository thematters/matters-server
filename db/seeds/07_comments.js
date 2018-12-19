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
          content: '<div>Test comment 1</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000012',
          author_id: 2,
          article_id: 2,
          content: '<div>Test comment 2</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000013',
          author_id: 3,
          article_id: 3,
          content: '<div>Test comment 3</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000014',
          parent_comment_id: 1,
          author_id: 1,
          article_id: 3,
          pinned: true,
          content: '<div>Test comment 4</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000015',
          parent_comment_id: 1,
          author_id: 2,
          article_id: 1,
          content: '<div>Test comment 4</div>'
        }
      ])
    })
}
