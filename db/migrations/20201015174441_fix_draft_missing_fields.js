const article_table = 'article'
const draft_table = 'draft'

export const up = async (knex) => {
  await knex.raw(`
    UPDATE
      ${draft_table}
    SET
      word_count = article_draft.word_count,
      data_hash = article_draft.data_hash,
      media_hash = article_draft.media_hash,
      language = article_draft.language
    FROM (
      SELECT
        article.*,
        article_id
      FROM
        ${article_table}
      LEFT JOIN ${draft_table} ON draft_id = draft.id
    WHERE
      draft.media_hash IS NULL
      OR draft.data_hash IS NULL
      AND article_id IS NOT NULL) AS article_draft
    WHERE
      draft.id = article_draft.draft_id
  `)
}

export const down = async (knex) => {}
