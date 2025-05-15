const table = 'article'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('is_ad').nullable()
    t.index('is_ad')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('is_ad')
    t.dropColumn('is_ad')
  })
}
