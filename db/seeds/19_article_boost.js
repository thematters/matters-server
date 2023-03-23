const table = 'article_boost'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          article_id: 1,
          boost: 10,
        },
        {
          article_id: 2,
          boost: 0.1,
        },
      ])
    })
}
