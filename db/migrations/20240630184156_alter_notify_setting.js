const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.renameColumn('article_new_comment', 'new_comment')
    t.renameColumn('article_new_appreciation', 'new_like')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.renameColumn('new_comment', 'article_new_comment')
    t.renameColumn('new_like', 'article_new_appreciation')
  })
}
