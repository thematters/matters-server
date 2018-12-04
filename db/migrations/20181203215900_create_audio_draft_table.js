const table = 'draft_audio'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
    t.bigInteger('author_id')
      .unsigned()
      .notNullable()
    t.string('mimetype')
    t.string('encoding')
    t.string('data')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('author_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
