import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex.raw(
    `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "transaction_purpose_check1";`
  )
}

export const down = () => {}
