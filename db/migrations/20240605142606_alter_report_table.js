const table = 'report'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('journal_id').unsigned().nullable()
    t.foreign('journal_id').references('id').inTable('journal')

    t.index('journal_id')
    t.index('article_id')
    t.index('comment_id')
    t.index('reporter_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('journal_id')

    t.dropIndex('journal_id')
    t.dropIndex('article_id')
    t.dropIndex('comment_id')
    t.dropIndex('reporter_id')
  })
}
