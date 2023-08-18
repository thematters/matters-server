const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(false)
    t.boolean('article_comment_pinned').notNullable().defaultTo(false)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(true)
    t.boolean('article_comment_pinned').notNullable().defaultTo(true)
  })
}
