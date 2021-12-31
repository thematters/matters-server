const { alterEnumString } = require('../utils')

const table = 'user'
const crypto_wallet_table = 'crypto_wallet_signature'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.string('eth_address').unique()
  })

  await knex.schema
    .raw(
      alterEnumString(crypto_wallet_table, 'purpose', [
        'airdrop',
        'connect',
        'signup',
        'login',
      ])
    )
    .alterTable(crypto_wallet_table, (t) => {
      // at time of generating signing message, the user_id might not be created yet
      t.dropForeign('user_id')
      t.setNullable('user_id')
      t.string('signed_message', 1023).alter()
    })
}

exports.down = async (knex) => {
  await knex.schema
    .alterTable(crypto_wallet_table, (t) => {
      // t.enu('purpose', ['airdrop', 'connect']).alter()
      t.string('signed_message', 255).alter()
      t.foreign('user_id').references('id').inTable('user')
    })
    .raw(
      alterEnumString(crypto_wallet_table, 'purpose', ['airdrop', 'connect'])
    )

  await knex.schema.table(table, (t) => {
    t.dropColumn('eth_address')
  })
}
