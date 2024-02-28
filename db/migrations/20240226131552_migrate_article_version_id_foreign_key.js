exports.up = async (knex) => {
  // add article_version_id field
  await knex.schema.alterTable('comment', (t) => {
    t.bigInteger('article_version_id')
    t.foreign('article_version_id').references('id').inTable('article_version')
  })
  await knex.schema.alterTable('transaction', (t) => {
    t.bigInteger('article_version_id')
    t.foreign('article_version_id').references('id').inTable('article_version')
  })
  await knex.schema.alterTable('action_article', (t) => {
    t.bigInteger('article_version_id')
    t.foreign('article_version_id').references('id').inTable('article_version')
  })
  await knex.schema.alterTable('article_translation', (t) => {
    t.bigInteger('article_version_id')
    t.foreign('article_version_id').references('id').inTable('article_version')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('article_translation', (t) => {
    t.dropColumn('article_version_id')
  })
  await knex.schema.alterTable('comment', (t) => {
    t.dropColumn('article_version_id')
  })
  await knex.schema.alterTable('transaction', (t) => {
    t.dropColumn('article_version_id')
  })
  await knex.schema.alterTable('action_article', (t) => {
    t.dropColumn('article_version_id')
  })
}
