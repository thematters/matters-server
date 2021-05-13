const payoutAccount = 'payout_account'

exports.up = async (knex) => {
  await knex.schema.table(payoutAccount, function (t) {
    t.boolean('capabilities_transfers').defaultTo(false)
  })

  // archive all payout account
  await knex(payoutAccount).update({ archived: true })
}

exports.down = async (knex) => {
  await knex.schema.table(payoutAccount, function (t) {
    t.dropColumn('capabilities_transfers')
  })
}
