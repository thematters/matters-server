import type { GQLWalletResolvers } from '#definitions/index.js'

const resolver: GQLWalletResolvers['stripeAccount'] = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!id || viewer.id !== id) {
    return null
  }

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
