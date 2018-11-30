const table = 'user'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
      .notNullable()
      .unique()
    t.string('user_name')
      .notNullable()
      .unique()
    t.string('display_name').notNullable()
    t.text('description')
    t.string('avatar').notNullable()
    t.string('email')
      .notNullable()
      .unique()
    t.string('mobile').notNullable()
    t.text('password').notNullable()
    t.integer('read_speed').defaultTo(500)
    t.integer('base_gravity')
      .notNullable()
      .defaultTo(0)
    t.integer('curr_gravity')
      .notNullable()
      .defaultTo(0)
    t.integer('mat')
      .notNullable()
      .defaultTo(0)
    t.string('language').notNullable()
    t.specificType('oauth_type', 'text ARRAY')
    t.string('status').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
