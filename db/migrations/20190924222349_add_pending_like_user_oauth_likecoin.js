const table = 'user_oauth_likecoin'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.decimal('pending_like', 36, 18)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('pending_like')
  })
}
