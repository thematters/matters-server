const { alterEnumString } = require('../utils')

const table = 'transaction'

exports.up = async (knex) => {
  await knex.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "transaction_purpose_check1";`)
}

exports.down = () => {}
