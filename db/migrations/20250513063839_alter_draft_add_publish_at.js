const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp('publish_at')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('publish_at')
  })
}
