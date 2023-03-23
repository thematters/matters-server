export const up = async (knex) => {
  await knex.raw(/*sql*/ `
  UPDATE article SET state = 'error' WHERE id IN (
    SELECT article.id FROM draft
    LEFT JOIN article ON article.draft_id = draft.id
      WHERE draft.publish_state != 'published' AND  article.draft_id IS NOT NULL
  )
  `)
}

export const down = async (knex) => {
  await knex.raw(/*sql*/ `
  UPDATE article SET state = 'active' WHERE state = 'error'
  `)
}
