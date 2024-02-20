exports.up = async (knex) => {
  await knex.schema.table('article', (t) => {
    t.dropColumn('uuid')
    t.dropColumn('title')
    t.dropColumn('slug')
    t.dropColumn('cover')
    t.dropColumn('upstream_id')
    t.dropColumn('live')
    t.dropColumn('public')
    t.dropColumn('content')
    t.dropColumn('summary')
    t.dropColumn('language')
    t.dropColumn('data_hash')
    t.dropColumn('media_hash')
    t.dropColumn('iscn_id')
    t.dropColumn('draft_id')
  })

  await knex.schema.table('draft', (t) => {
    t.dropColumn('uuid')
    t.dropColumn('summary_customized')
    t.dropColumn('word_count')
    t.dropColumn('language')
    t.dropColumn('data_hash')
    t.dropColumn('media_hash')
    t.dropColumn('prev_draft_id')
    t.dropColumn('iscn_id')
    t.dropColumn('pin_state')
    t.dropColumn('sensitive_by_admin')
  })
}

exports.down = async () => {
  // do nothing
}
