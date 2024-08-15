const table = 'article_tag'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['tag_id', 'article_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['tag_id', 'article_id'])
  })
}
