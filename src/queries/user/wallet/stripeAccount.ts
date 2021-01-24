import { WalletToStripeAccountResolver } from 'definitions'

const resolver: WalletToStripeAccountResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const payoutAccount = await atomService.findFirst({
    table: 'payout_account',
    where: { userId: id, archived: false },
  })

  if (!payoutAccount) {
    return null
  }

  return payoutAccount
}

export default resolver
