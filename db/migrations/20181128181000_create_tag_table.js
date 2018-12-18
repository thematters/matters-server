const table = 'tag'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.string('content')
      .notNullable()
      .unique()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
