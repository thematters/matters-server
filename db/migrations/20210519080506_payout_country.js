require('dotenv').config()
const Stripe = require('stripe')

const payoutAccount = 'payout_account'

exports.up = async (knex) => {
  // add `country` column
  await knex.schema.table(payoutAccount, function (t) {
    t.string('country')
  })

  // update country of connected accounts via Stripe API
  const secret = process.env['MATTERS_STRIPE_SECRET']
  const stripeAPI = new Stripe(secret, { apiVersion: '2020-08-27' })

  // retrieve payout accounts from DB
  const accounts = await knex.select().from(payoutAccount).where({
    archived: false,
    capabilities_transfers: true,
  })
  if (!accounts || accounts.length <= 0) {
    console.log('Payout accounts not found')
    return
  }

  // retrieve account detail from Stripe
  const stripeAccountsResult = await stripeAPI.accounts.list({
    limit: 100,
  })
  if (
    !stripeAccountsResult ||
    !stripeAccountsResult.data ||
    stripeAccountsResult.data.length <= 0
  ) {
    console.log('Stripe connected accounts not found')
    return
  }
  const stripeAccounts = stripeAccountsResult.data

  const total = (accounts || []).length
  for (const [index, account] of accounts.entries()) {
    try {
      const stripeAccountId = account.account_id
      console.log('-------------------------------')
      console.log(`Process ${index + 1}/${total} account: ${stripeAccountId}`)

      const stripeAccount = stripeAccounts.find(
        (sa) => sa.id === stripeAccountId
      )

      if (!stripeAccount) {
        console.log(`${stripeAccountId} doesn't match any Stripe account.`)
        continue
      }

      // update country to db record
      const country = stripeAccount.country
      await knex(payoutAccount).where({ account_id: stripeAccountId }).update({
        country,
      })
      console.log(`Updated ${stripeAccountId} country to ${country}`)
    } catch (error) {
      console.error(error)
      console.error(`Failed to process item: ${account.id}`)
    }
  }
}

exports.down = async (knex) => {
  await knex.schema.table(payoutAccount, function (t) {
    t.dropColumn('country')
  })
}
