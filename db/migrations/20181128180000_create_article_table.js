const table = 'article'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.increments()
    t.uuid('origin_id')
    t.integer('author_id')
      .unsigned()
      .notNullable()
    t.integer('upstream_id').unsigned()
    t.string('title').notNullable()
    t.string('cover').notNullable()
    t.string('abstract').notNullable()
    t.integer('word_count').notNullable()
    t.string('hash')
    t.string('s3_path').notNullable()
    t.enu('publish_state', [
      'archived',
      'pending',
      'error',
      'published'
    ]).notNullable()
    t.integer('mat').defaultTo(0)
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
