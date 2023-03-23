const table = 'transaction'
const column = 'remark'

export const up = (knex) =>
  knex.schema.table(table, (t) => {
    t.string(column)
  })

export const down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
