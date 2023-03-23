const table = 'tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index('owner')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex('owner')
  })
}
