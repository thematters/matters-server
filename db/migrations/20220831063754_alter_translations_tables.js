const article_translation_table = 'article_translation'
const tag_translation_table = 'tag_translation'

exports.up = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_id'])
    t.unique(['article_id', 'language'])
  })
  await knex.schema.table(tag_translation_table, (t) => {
    t.dropUnique(['tag_id'])
    t.unique(['tag_id', 'language'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_id', 'language'])
    t.unique(['article_id'])
  })
  await knex.schema.table(tag_translation_table, (t) => {
    t.dropUnique(['tag_id', 'language'])
    t.unique(['tag_id'])
  })
}
