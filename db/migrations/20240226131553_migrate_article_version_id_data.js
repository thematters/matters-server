exports.up = async (knex) => {
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

exports.down = () => {
  // do nothing
}
