const table = 'matters_choice'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          article_id: 1,
        },
      ])
    })
}
