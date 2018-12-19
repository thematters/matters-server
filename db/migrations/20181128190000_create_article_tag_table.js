const table = 'article_tag'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, function(t) {
    t.bigIncrements()
    t.bigInteger('article_id')
      .unsigned()
      .notNullable()
    t.bigInteger('tag_id')
      .unsigned()
      .notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.foreign('article_id')
      .references('id')
      .inTable('article')
    t.foreign('tag_id')
      .references('id')
      .inTable('tag')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(table)
}
