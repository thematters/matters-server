const table = 'user'
const newColumn = 'extra' // use jsonb for book-keeping some more features for a user

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.jsonb(newColumn)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
