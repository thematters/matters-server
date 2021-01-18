const table = 'user'
const column = 'payment_pointer'

exports.up = (knex) =>
  knex.schema.table(table, (t) => {
    t.text(column)
  })

exports.down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
