const table = 'user_ipns_keys'
const newColumn = 'stats' // use jsonb for book-keeping some more statistics of IPNS publishing

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
