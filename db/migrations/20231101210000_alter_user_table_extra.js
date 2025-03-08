const table = 'user'
const newColumn = 'extra' // use jsonb for book-keeping some more features for a user

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb(newColumn)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
