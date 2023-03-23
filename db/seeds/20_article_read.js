import { v4 } from 'uuid'
const table = 'article_read'

export const seed = function (knex, Promise) {
  return knex(table)
    .del()
    .then(function () {
      return knex(table).insert([
        {
          uuid: v4(),
          user_id: 1,
          article_id: 1,
        },
        {
          uuid: v4(),
          user_id: 1,
          article_id: 2,
        },
        {
          uuid: v4(),
          user_id: 2,
          article_id: 2,
        },
      ])
    })
}
