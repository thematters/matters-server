const { alterEnumString } = require('../utils')

const user_table = 'user'
const crypto_wallet_table = 'crypto_wallet_signature'

exports.up = async (knex) => {
  await knex.schema
    .raw(`ALTER TABLE "user" ALTER COLUMN state SET DEFAULT 'onboarding';`)
    .alterTable(user_table, (t) => {
      t.string('eth_address').unique()
      t.setNullable('email')
      t.setNullable('display_name')
      t.setNullable('password_hash')

      // t.text('state').defaultTo('onboarding').alter()
    })

  await knex.schema
    .raw(
      // [
      alterEnumString(crypto_wallet_table, 'purpose', [
        'airdrop',
        'connect',
        'signup',
        'login',
      ])
      // `ALTER TABLE ${crypto_wallet_table} ALTER COLUMN user_id DROP NOT NULL;`,
      // ].join('\n')
    )
    .alterTable(crypto_wallet_table, (t) => {
      // at time of generating signing message, the user_id might not be created yet
      // t.dropForeign('user_id')
      t.setNullable('user_id') // requires 'knex >= 0.95.11'
      t.string('signed_message', 1023).alter()
      t.setNullable('signature')
      t.timestamp('expired_at')
      t.string('nonce')
    })
}

exports.down = async (knex) => {
  await knex.schema
    .alterTable(crypto_wallet_table, (t) => {
      // t.enu('purpose', ['airdrop', 'connect']).alter()
      t.string('signed_message', 255).alter()
      t.dropColumn('expired_at')
      t.dropColumn('nonce')

      // once user_id has nullable values, reset to not null would fail
    })
    .raw(
      alterEnumString(crypto_wallet_table, 'purpose', ['airdrop', 'connect'])
    )

  await knex.schema
    .alterTable(user_table, (t) => {
      t.dropColumn('eth_address')

      // t.text('state').defaultTo('active').alter()
    })
    .raw(`ALTER TABLE "user" ALTER COLUMN state SET DEFAULT 'active';`)
}
