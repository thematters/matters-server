const table = 'crypto_wallet_signature'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('status', ['active', 'inactive', 'expired', 'used'])
      .notNullable()
      .defaultTo('active')
    // t.timestamp('verified_at')
    t.timestamp('used_at')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    // t.dropColumn('verified_at')
    t.dropColumn('used_at')
    t.dropColumn('status')
  })
}
