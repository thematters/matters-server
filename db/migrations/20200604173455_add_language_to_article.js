const table = 'article'
const column = 'language'

exports.up = (knex) =>
  knex.schema.table(table, (t) => {
    t.string(column) // .defaultTo('')
  })

exports.down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
