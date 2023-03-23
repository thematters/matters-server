const article_table = 'article'
const draft_table = 'draft'
const article_tag_table = 'article_tag'
const tag_table = 'tag'
const collection_table = 'collection'

const REMARK = '{20200924152927_fix_article_draft_relationship,}'

export const up = async (knex) => {
  // Create drafts from articles
  await knex.raw(`
    INSERT INTO ${draft_table} (
      uuid,
      author_id,
      article_id,

      data_hash,
      media_hash,

      title,
      cover,
      summary,
      content,
      word_count,
      language,

      tags,
      collection,

      archived,
      publish_state,

      created_at,
      updated_at
    )
    SELECT
      md5(random()::text || clock_timestamp()::text)::uuid AS uuid,
      article.author_id,
      article.id,

      article.data_hash,
      article.media_hash,

      article.title,
      article.cover,
      article.summary,
      article."content",
      article.word_count,
      article.language,

      ARRAY_REMOVE(ARRAY_AGG(article_tag_detail.content), NULL) AS tags,
      ARRAY_REMOVE(ARRAY_AGG(collection.article_id), NULL) AS collection,

      TRUE AS archived,
      'published' AS publish_state,

      article.created_at,
      article.created_at AS updated_at
    FROM
      ${article_table}
      LEFT JOIN (
        SELECT
          article_tag.*,
          tag."content"
        FROM
          ${article_tag_table}
          LEFT JOIN ${tag_table} ON tag.id = article_tag.tag_id) AS article_tag_detail ON article_tag_detail.article_id = article.id
      LEFT JOIN ${collection_table} ON collection.entrance_id = article.id
    WHERE
      draft_id IS NULL
    GROUP BY
      article.id
  `)
  console.log('created drafts.')

  // Update `draft_id` of articles
  await knex.raw(`
    UPDATE
      ${article_table}
    SET
      draft_id = draft_article.draft_id,
      remark = '${REMARK}'
    FROM (
      SELECT DISTINCT ON (draft.article_id)
        draft.id AS draft_id,
        draft.article_id
      FROM
        ${article_table}
      LEFT JOIN ${draft_table} ON article.id = draft.article_id
    WHERE
      draft.publish_state = 'published'
      AND draft.article_id IS NOT NULL
      AND article.draft_id IS NULL) AS draft_article
    WHERE
      article.id = draft_article.article_id
  `)
  console.log('updated articles.')
}

export const down = async (knex) => {}
