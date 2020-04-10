const table = 'tag'

exports.seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          content: 'test',
        },
        {
          content: 'article',
        },
      ])
    })
}
