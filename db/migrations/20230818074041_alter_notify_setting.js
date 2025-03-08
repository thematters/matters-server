const table = 'user_notify_setting'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(false).alter()
    t.boolean('article_comment_pinned').notNullable().defaultTo(false).alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(true).alter()
    t.boolean('article_comment_pinned').notNullable().defaultTo(true).alter()
  })
}
