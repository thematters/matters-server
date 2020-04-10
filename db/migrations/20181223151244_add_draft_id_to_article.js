const table = 'article'
const column = 'draft_id'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger(column).unsigned()

    t.foreign(column).references('id').inTable('draft')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
