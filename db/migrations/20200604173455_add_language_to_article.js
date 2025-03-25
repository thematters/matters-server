const table = 'article'
const column = 'language'

export const up = (knex) =>
  knex.schema.table(table, (t) => {
    t.string(column) // .defaultTo('')
  })

export const down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
