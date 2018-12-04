const table = 'draft'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
    t.bigInteger('author_id')
      .unsigned()
      .notNullable()
    t.bigInteger('upstream_id').unsigned()
    t.string('title').notNullable()
    t.string('cover').notNullable()
    t.text('content').notNullable()
    t.specificType('tags', 'text ARRAY')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('author_id')
      .references('id')
      .inTable('user')
    t.foreign('upstream_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
