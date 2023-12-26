const table = 'article'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('upstream_id')
    t.dropColumn('live')
    t.dropColumn('public')
    t.dropColumn('title')
    t.dropColumn('slug')
    t.dropColumn('content')
    t.dropColumn('summary')
    t.dropColumn('word_count')
    t.dropColumn('language')
    t.dropColumn('data_hash')
    t.dropColumn('media_hash')
    t.dropColumn('iscn_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('upstream_id').unsigned()
    t.string('title')
    t.string('slug')
    t.bigInteger('cover').unsigned()
    t.string('summary')
    t.integer('word_count')
    t.string('data_hash')
    t.string('media_hash')
    t.string('iscn_id')
    t.string('language')
    t.text('content').notNullable()
    t.boolean('public').defaultTo(false)
    t.boolean('live').defaultTo(false)
  })
}
