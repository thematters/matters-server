export const up = async (knex) => {
  await knex.schema.table('moment', (t) => {
    t.boolean('is_ad').nullable()

    t.index('is_ad')
  })
}

export const down = async (knex) => {
  await knex.schema.table('moment', (t) => {
    t.dropIndex('is_ad')

    t.dropColumn('is_ad')
  })
}
