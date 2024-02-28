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
  // populate article_version_id
  await knex.raw(`
    UPDATE comment
    SET article_version_id = (
      SELECT article_version.id
      FROM article_version
      WHERE article_version.article_id = comment.target_id
        AND article_version.created_at <= comment.created_at
      ORDER BY article_version.created_at DESC
      LIMIT 1
    )
    WHERE type = 'article'
  `)
  await knex.raw(`
    UPDATE transaction
    SET article_version_id = (
      SELECT article_version.id
      FROM article_version
      WHERE article_version.article_id = transaction.target_id
        AND article_version.created_at <= transaction.created_at
      ORDER BY article_version.created_at DESC
      LIMIT 1
    ) WHERE target_type = 4
  `)
  await knex.raw(`
    UPDATE action_article
    SET article_version_id = (
      SELECT article_version.id
      FROM article_version
      WHERE article_version.article_id = action_article.target_id
        AND article_version.created_at <= action_article.created_at
      ORDER BY article_version.created_at DESC
      LIMIT 1
    )
  `)
  await knex.raw(`
    UPDATE article_translation
    SET article_version_id = (
      SELECT article_version.id
      FROM article_version
      WHERE article_version.article_id = article_translation.article_id
        AND article_version.created_at <= article_translation.created_at
      ORDER BY article_version.created_at DESC
      LIMIT 1
    )
  `)
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
