const table = 'user'
const column = 'payment_pointer'

export const up = (knex) =>
  knex.schema.table(table, (t) => {
    t.text(column)
  })

export const down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
