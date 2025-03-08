const table = 'draft'
const newColumn = 'campaigns'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb(newColumn)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
