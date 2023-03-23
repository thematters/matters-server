const table = 'tag'

export const up = async (knex) => {
  // default creator would be matty if article_tag does not exist
  await knex.raw(`
    UPDATE
      tag
    SET
      creator = source.author_id
    FROM
      (
        SELECT
          base.*, article.author_id
        FROM (
          SELECT
            tag_id, min(article_id) article_id, min(created_at) created_at
          FROM
            article_tag
          GROUP BY
            tag_id
        ) AS base
        INNER JOIN article ON base.article_id = article.id
      ) AS source
    WHERE tag.id = source.tag_id
  `)
}

export const down = async (knex) => {
  const user = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (user) {
    await knex(table).update({ creator: user.id })
  }
}
