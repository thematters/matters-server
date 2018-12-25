const table = 'draft'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          author_id: '1',
          title: 'test draft 1',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          author_id: '2',
          title: 'test draft 2',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          author_id: '3',
          title: 'test draft 3',
          summary: 'Some text of sumamry',
          content: '<div>some html string</div>'
        }
      ])
    })
}
