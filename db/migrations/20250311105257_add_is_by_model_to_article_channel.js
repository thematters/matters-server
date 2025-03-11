const article_channel_table = 'article_channel'

exports.up = async (knex) => {
  await knex.schema.table(article_channel_table, (t) => {
    t.boolean('is_by_model').defaultTo(true).notNullable()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(article_channel_table, (t) => {
    t.dropColumn('is_by_model')
  })
}
