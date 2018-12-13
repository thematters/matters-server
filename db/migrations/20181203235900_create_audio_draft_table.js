const table = 'audio_draft'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
      .notNullable()
      .unique()
    t.bigInteger('author_id')
      .unsigned()
      .notNullable()
    t.string('title').notNullable()
    t.string('s3_path').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Set foreign key
    t.foreign('author_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
