const draft_table = 'draft'
const article_table = 'article'

exports.up = async (knex) => {
  // Draft
  await knex.schema.table(draft_table, (t) => {
    // drop deprecated
    t.dropColumn('upstream_id')
    t.dropColumn('scheduled_at')

    // new from article
    t.integer('word_count')
    t.string('data_hash')
    t.string('media_hash')
    t.string('language')

    // versioning
    t.bigInteger('prev_draft_id').unsigned()
    t.bigInteger('article_id').unsigned()

    t.foreign('prev_draft_id').references('id').inTable(draft_table)
    t.foreign('article_id').references('id').inTable(article_table)

    // indexes
    t.index(['prev_draft_id', 'article_id'])
  })

  // Article
  await knex.schema.table(article_table, (t) => {
    t.index('draft_id')
  })
}

exports.down = async (knex) => {
  // Article
  await knex.schema.table(article_table, (t) => {
    t.dropIndex('draft_id')
  })

  // Draft
  await knex.schema.table(draft_table, (t) => {
    t.dropIndex(['prev_draft_id', 'article_id'])

    t.dropColumn('article_id')
    t.dropColumn('prev_draft_id')

    t.dropColumn('language')
    t.dropColumn('media_hash')
    t.dropColumn('data_hash')
    t.dropColumn('word_count')

    t.timestamp('scheduled_at')
    t.bigInteger('upstream_id').unsigned()
    t.foreign('upstream_id').references('id').inTable(article_table)
  })
}
