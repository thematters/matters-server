const table = 'campaign'
const column = 'exclusive'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean(column).notNullable().defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
}
