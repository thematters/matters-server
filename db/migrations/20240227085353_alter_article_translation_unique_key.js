const article_translation_table = 'article_translation'

export const up = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_id', 'language'])
    t.unique(['article_version_id', 'language'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(article_translation_table, (t) => {
    t.dropUnique(['article_version_id', 'language'])
    t.unique(['article_id', 'language'])
  })
}
