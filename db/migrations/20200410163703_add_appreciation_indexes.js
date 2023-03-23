const table = 'appreciation'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['reference_id', 'purpose'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['reference_id', 'purpose'])
  })
}
