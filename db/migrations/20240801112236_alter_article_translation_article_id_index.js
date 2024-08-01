const table = 'article_translation'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['article_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['article_id'])
  })
}
