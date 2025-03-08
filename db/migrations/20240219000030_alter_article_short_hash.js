const table = 'article'

const newColumn = 'short_hash'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.string(newColumn).unique() // add .notNullable() after filled short_hash for all rows
    t.index(newColumn)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
