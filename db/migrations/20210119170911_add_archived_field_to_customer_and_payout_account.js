const customer = 'customer'
const payoutAccount = 'payout_account'

export const up = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.boolean('archived').defaultTo(false)
  })
  await knex.schema.table(payoutAccount, function (t) {
    t.boolean('archived').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(customer, function (t) {
    t.dropColumn('archived')
  })
  await knex.schema.table(payoutAccount, function (t) {
    t.dropColumn('archived')
  })
}
