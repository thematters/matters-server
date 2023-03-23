const table = 'user'
const column = 'liker_id'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.string(column).unique()
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
