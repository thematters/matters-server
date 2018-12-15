const { baseDown } = require('../utils')

const table = 'audio_draft'

exports.up = async knex => {
  await knex('entity_type').insert({ table })
  await knex.schema.createTable(table, t => {
    t.bigIncrements('id').primary()
    t.uuid('uuid')
      .notNullable()
      .unique()
    t.bigInteger('author_id')
      .unsigned()
      .notNullable()
    t.string('title').notNullable()
    t.string('mimetype')
    t.string('encoding')
    t.string('s3_path').notNullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    // Set foreign key
    t.foreign('author_id')
      .references('id')
      .inTable('user')
  })
}

exports.down = baseDown(table)
