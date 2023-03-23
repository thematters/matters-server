const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('media_hash')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('media_hash')
  })
}
