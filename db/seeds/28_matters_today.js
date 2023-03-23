const table = 'matters_today'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          article_id: 2,
        },
      ])
    })
}
