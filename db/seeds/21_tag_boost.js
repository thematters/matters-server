const table = 'tag_boost'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(function() {
      return knex(table).insert([
        {
          tag_id: 1,
          boost: 10
        }
      ])
    })
}
