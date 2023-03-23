const payoutAccount = 'payout_account'

export const up = async (knex) => {
  await knex.schema.table(payoutAccount, function (t) {
    t.boolean('capabilities_transfers').defaultTo(false)
  })

  // archive all payout account
  await knex(payoutAccount).update({ archived: true })
}

export const down = async (knex) => {
  await knex.schema.table(payoutAccount, function (t) {
    t.dropColumn('capabilities_transfers')
  })
}
