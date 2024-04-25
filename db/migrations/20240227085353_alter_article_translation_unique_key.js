const article_translation_table = 'article_translation'

exports.up = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_id', 'language'])
    t.unique(['article_version_id', 'language'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_version_id', 'language'])
    t.unique(['article_id', 'language'])
  })
}
