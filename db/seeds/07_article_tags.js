const table = 'article_tag'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          article_id: '1',
          tag_id: '1',
        },
        {
          article_id: '1',
          tag_id: '2',
        },
        {
          article_id: '2',
          tag_id: '2',
        },
      ])
    })
}
