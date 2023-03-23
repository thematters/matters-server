const article_table = 'article'
const draft_table = 'draft'

export const up = async (knex) => {
  await knex.raw(`
    UPDATE
      ${draft_table}
    SET
      article_id = article_draft.id
    FROM (
      SELECT
        article.id,
        draft_id,
        article_id
      FROM
        ${article_table}
      LEFT JOIN ${draft_table} ON draft_id = draft.id
    WHERE
      draft_id IS NOT NULL
      AND draft.article_id IS NULL) AS article_draft
    WHERE
      draft.id = article_draft.draft_id
  `)
}

export const down = async (knex) => {}
