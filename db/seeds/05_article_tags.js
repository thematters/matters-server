const table = 'article_tag'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          article_id: '1',
          tag: 'test'
        },
        {
          article_id: '1',
          tag: 'article'
        },
        {
          article_id: '2',
          tag: 'article'
        }
      ])
    })
}
