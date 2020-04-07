const table = 'article_read_count'

exports.up = async knex => {
  await knex.schema.table(table, t => {
    t.index(['user_id', 'article_id'])
  })
}

exports.down = async knex => {
  await knex.schema.table(table, t => {
    t.dropIndex(['user_id', 'article_id'])
  })
}
