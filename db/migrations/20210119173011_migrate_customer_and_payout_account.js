const customer = 'customer'
const payoutAccount = 'payout_account'

export const up = async (knex) => {
  await knex(customer).update({ archived: true })
  await knex(payoutAccount).update({ archived: true })
}

export const down = async (knex) => {
  await knex(customer).update({ archived: false })
  await knex(payoutAccount).update({ archived: false })
}
