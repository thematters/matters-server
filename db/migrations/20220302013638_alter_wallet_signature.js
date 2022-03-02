const { alterEnumString } = require('../utils')

const crypto_wallet_table = 'crypto_wallet_signature'

exports.up = async (knex) => {
  await knex.raw(
    alterEnumString(crypto_wallet_table, 'purpose', [
      'airdrop',
      'connect',
      'signup',
      'login',
      'claimLogbook',
    ])
  )
}

exports.down = async (knex) => {
  await knex.raw(
    alterEnumString(crypto_wallet_table, 'purpose', [
      'airdrop',
      'connect',
      'signup',
      'login',
    ])
  )
}
