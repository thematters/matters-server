const table = 'appreciate'

exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex(table)
    .del()
    .then(function() {
      // Inserts seed entries
      return knex(table).insert([
        { user_id: 1, amount: 10, article_id: 1 },
        { user_id: 1, amount: 10, article_id: 1 },
        { user_id: 2, amount: 30, article_id: 1 },
        { user_id: 2, amount: 10, article_id: 2 },
        { user_id: 3, amount: 50, article_id: 3 },
        { user_id: 3, amount: 100, article_id: 1 }
      ])
    })
}
