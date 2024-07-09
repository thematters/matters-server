const table = 'draft'
const newColumn = 'campaigns'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb(newColumn)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
