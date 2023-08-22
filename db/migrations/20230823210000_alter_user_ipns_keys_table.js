const table = 'user_ipns_keys'
const newColumn = 'stats' // use jsonb for book-keeping some more statistics of IPNS publishing

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
