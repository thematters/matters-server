const table = 'tag'

export const seed = function (knex, Promise) {
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
        {
          content: 'tag',
        },
        {
          content: 'tag1',
        },
        {
          content: 'tag2',
        },
        {
          content: 'tag3',
        },
      ])
    })
}
