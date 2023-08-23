const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(false).alter()
    t.boolean('article_comment_pinned').notNullable().defaultTo(false).alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(true).alter()
    t.boolean('article_comment_pinned').notNullable().defaultTo(true).alter()
  })
}
