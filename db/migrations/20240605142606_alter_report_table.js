const table = 'report'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('moment_id').unsigned().nullable()
    t.foreign('moment_id').references('id').inTable('moment')

    t.index('moment_id')
    t.index('article_id')
    t.index('comment_id')
    t.index('reporter_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('moment_id')

    t.dropIndex('moment_id')
    t.dropIndex('article_id')
    t.dropIndex('comment_id')
    t.dropIndex('reporter_id')
  })
}
