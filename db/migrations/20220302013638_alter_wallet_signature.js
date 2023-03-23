import { alterEnumString } from '../utils.js'

const crypto_wallet_table = 'crypto_wallet_signature'

export const up = async (knex) => {
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

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(crypto_wallet_table, 'purpose', [
      'airdrop',
      'connect',
      'signup',
      'login',
    ])
  )
}
