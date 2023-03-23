export const up = async (knex) => {
  await knex.raw(/*sql*/ `
    INSERT INTO collection (entrance_id, article_id, "order")
    SELECT id, upstream_id, 0 FROM article WHERE upstream_id IS NOT NULL
  `)
}

export const down = async (knex) => {
  await knex('collection').truncate()
}
