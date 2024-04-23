const table = 'article'

const newColumn = 'short_hash'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.string(newColumn).unique() // add .notNullable() after filled short_hash for all rows
    t.index(newColumn)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
