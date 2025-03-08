const table = 'user_notify_setting'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('article_new_collected')
  })
}
