const customer = 'customer'
const payoutAccount = 'payout_account'

exports.up = async (knex) => {
  await knex(customer).update({ archived: true })
  await knex(payoutAccount).update({ archived: true })
}

exports.down = async (knex) => {
  await knex(customer).update({ archived: false })
  await knex(payoutAccount).update({ archived: false })
}
