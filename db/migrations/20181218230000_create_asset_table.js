const table = 'asset'

exports.up = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex.schema.createTable(table, function(t) {
        t.bigIncrements('id').primary()
        t.uuid('uuid')
          .notNullable()
          .unique()
        t.bigInteger('author_id')
          .unsigned()
          .notNullable()
        t.string('type').notNullable()
        t.string('path').notNullable()
        t.timestamp('created_at').defaultTo(knex.fn.now())
        t.timestamp('updated_at').defaultTo(knex.fn.now())

        // Set foreign key
        t.foreign('author_id')
          .references('id')
          .inTable('user')
      })
    })
    .then(function() {
      return Promise.all([
        knex.schema.alterTable('user', function(t) {
          t.foreign('avatar')
            .references('id')
            .inTable('asset')
        }),
        knex.schema.alterTable('article', function(t) {
          t.foreign('cover')
            .references('id')
            .inTable('asset')
        }),
        knex.schema.alterTable('draft', function(t) {
          t.foreign('cover')
            .references('id')
            .inTable('asset')
        }),
        knex.schema.alterTable('audio_draft', function(t) {
          t.foreign('audio')
            .references('id')
            .inTable('asset')
        })
      ])
    })
}

exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return Promise.all([
        knex.schema.alterTable('user', function(t) {
          t.dropForeign('avatar')
        }),
        knex.schema.alterTable('article', function(t) {
          t.dropForeign('cover')
        }),
        knex.schema.alterTable('draft', function(t) {
          t.dropForeign('cover')
        }),
        knex.schema.alterTable('audio_draft', function(t) {
          t.dropForeign('audio')
        })
      ])
    })
    .then(function() {
      return knex.schema.dropTable(table)
    })
}
