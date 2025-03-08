const table = 'article'
const column = 'draft_id'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger(column).unsigned()

    t.foreign(column).references('id').inTable('draft')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
