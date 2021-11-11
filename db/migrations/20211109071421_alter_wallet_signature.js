const table = 'crypto_wallet_signature'
const wallet_table = 'crypto_wallet'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('user_id').unsigned()
    t.foreign('user_id').references('id').inTable('user')
  })

  // set `user_id` from `crypto_wallet`
  await knex.raw(`
    UPDATE
      ${table}
    SET
      user_id = source.user_id
    FROM
      (
        SELECT
          ${wallet_table}.user_id, ${wallet_table}.address
        FROM
          ${wallet_table}
        LEFT JOIN ${table} as signature
          ON ${wallet_table}.address = signature.address
        WHERE archived = FALSE
      ) AS source
    WHERE ${table}.address = source.address
  `)

  // make sure `user_id` is not null
  await knex.schema.table(table, (t) => {
    t.bigInteger('user_id').unsigned().notNullable().alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('user_id')
  })
}
