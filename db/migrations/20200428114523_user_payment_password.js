const table = 'user'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('payment_password_hash')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('payment_password_hash')
  })
}
