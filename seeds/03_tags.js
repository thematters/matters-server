exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('article_tag')
    .del()
    .then(function() {
      // Inserts seed entries
      return knex('article_tag').insert([
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
