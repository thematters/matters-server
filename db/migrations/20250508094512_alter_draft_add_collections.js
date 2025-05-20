const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.specificType('collections', 'text ARRAY')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('collections')
  })
}
