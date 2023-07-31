import type { GQLWalletResolvers } from 'definitions'

const resolver: GQLWalletResolvers['stripeAccount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const payoutAccount = await atomService.findFirst({
    table: 'payout_account',
    where: { userId: id, capabilitiesTransfers: true, archived: false },
  })

  if (!payoutAccount) {
    return null
  }

  return payoutAccount
}

export default resolver
