const table = 'draft'
const newColumn = 'indent_first_line'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean(newColumn).notNullable().defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn(newColumn)
  })
}
