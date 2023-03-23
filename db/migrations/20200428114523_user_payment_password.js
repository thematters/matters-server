const table = 'user'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('payment_password_hash')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('payment_password_hash')
  })
}
