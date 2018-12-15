const table = 'entity_type'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.string('table').notNullable()
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
