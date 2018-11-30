const table = 'article_tag'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.increments()
    t.integer('article_id')
      .unsigned()
      .notNullable()
    t.string('tag').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id')
      .references('id')
      .inTable('article')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
