const table = 'action_user'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').notNullable()
    t.enu('action', ['follow', 'rate'])
    t.bigInteger('target_id').notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('created_at').defaultTo(knex.fn.now())

    t.unique(['user_id', 'action', 'target_id'])

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
    t.foreign('target_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
