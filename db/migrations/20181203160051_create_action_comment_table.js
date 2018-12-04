const table = 'action_comment'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').notNullable()
    t.enu('action', ['up_vote', 'down_vote'])
    t.bigInteger('target_id').notNullable()
    t.timestamp('updated_at').defaultTo(knex.fn.now())
    t.timestamp('created_at').defaultTo(knex.fn.now())

    // Setup foreign key
    t.foreign('user_id')
      .references('id')
      .inTable('user')
    t.foreign('target_id')
      .references('id')
      .inTable('comment')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
