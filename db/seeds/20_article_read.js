const { v4 } = require('uuid')
const table = 'article_read'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          user_id: 1,
          article_id: 1
        },
        {
          user_id: 1,
          article_id: 2
        },
        {
          user_id: 2,
          article_id: 2
        }
      ])
    })
}
