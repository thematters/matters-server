import type { GQLUserInfoResolvers } from '#definitions/index.js'

const resolver: GQLUserInfoResolvers['cryptoWallet'] = async (
  { id, ethAddress },
  _,
  { dataSources: { atomService } }
) => {
  if (ethAddress) {
    return { address: ethAddress }
  }
  const wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id, archived: false },
  })

  if (wallet) {
    return { address: wallet.address }
  }

  return null
}

export default resolver
