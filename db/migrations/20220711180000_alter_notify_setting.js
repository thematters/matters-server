const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('article_new_collected').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('article_new_collected')
  })
}
