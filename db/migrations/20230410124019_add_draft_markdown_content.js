const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('content_md')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('content_md')
  })
}
