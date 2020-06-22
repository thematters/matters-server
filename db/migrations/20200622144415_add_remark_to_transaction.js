const table = 'transaction'
const column = 'remark'

exports.up = (knex) =>
  knex.schema.table(table, (t) => {
    t.string(column)
  })

exports.down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
