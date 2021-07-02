const draft_table = 'draft'
const article_circle_table = 'article_circle'

exports.up = async (knex) => {
  // mark license of paywalled articles as `arr`
  await knex.raw(`
    UPDATE
      ${draft_table}
    SET
      license = 'arr'
    FROM (
      SELECT
        d.id
      FROM
        ${draft_table} AS d
        JOIN ${article_circle_table} ON ${article_circle_table}.article_id = d.article_id
      WHERE
        d.publish_state = 'published'
        AND ${article_circle_table}.access = 'paywall') AS arr_draft
    WHERE
      ${draft_table}.id = arr_draft.id
  `)
}

exports.down = async () => {}
