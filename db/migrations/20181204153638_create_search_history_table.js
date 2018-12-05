const table = 'serach_history'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').notNullable()
    t.text('search_key').notNullable()
    t.boolean('archived').defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
