import { alterEnumString } from '../utils.js'

const table = 'transaction'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.decimal('fee', 36, 18)
  })

  await knex.raw(
    alterEnumString(table, 'purpose', ['donation', 'add-credit', 'refund'])
  )
}

export const down = async (knex) => {
  await knex.raw(
    alterEnumString(table, 'purpose', [
      'donation',
      'add-credit',
      'refund',
      'fee',
    ])
  )

  await knex.schema.table(table, (t) => {
    t.dropColumn('fee')
  })
}
