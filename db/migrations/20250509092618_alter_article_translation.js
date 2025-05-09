const table = 'article_translation'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('title').alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('title').alter()
  })
}
