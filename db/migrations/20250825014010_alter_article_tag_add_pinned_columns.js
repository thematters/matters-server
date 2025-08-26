const table = 'article_tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('pinned').notNullable().defaultTo(false)
    t.timestamp('pinned_at').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('pinned')
    t.dropColumn('pinned_at')
  })
}
