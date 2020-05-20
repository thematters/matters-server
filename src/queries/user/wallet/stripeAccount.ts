import { WalletToStripeAccountResolver } from 'definitions'

const resolver: WalletToStripeAccountResolver = async (
  { id },
  _,
  { dataSources: { paymentService } }
) => {
  const payoutAccount = (
    await paymentService.findPayoutAccount({ userId: id })
  )[0]

  if (!payoutAccount) {
    return null
  }

  return payoutAccount
}

export default resolver
