const table = 'campaign'
const column = 'featured_description'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text(column).notNullable().defaultTo('')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
}
