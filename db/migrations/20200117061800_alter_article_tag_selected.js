const table = 'article_tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('selected')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('selected')
  })
}
