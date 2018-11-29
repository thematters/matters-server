exports.up = function(knex, Promise) {
  return knex.schema.createTable('user', function(t) {
    t.increments()
    t.uuid('origin_id')
    t.string('username').notNullable()
    t.string('email').notNullable()
    t.string('mobile').notNullable()
    t.string('password').notNullable()
    t.string('avatar').notNullable()
    t.string('description')
    t.string('facebook')
    t.integer('read_speed').defaultTo(500)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('user')
}
