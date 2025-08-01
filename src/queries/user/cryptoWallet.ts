import type { GQLUserInfoResolvers } from '#definitions/index.js'

const resolver: GQLUserInfoResolvers['cryptoWallet'] = async (
  { id, ethAddress },
  _,
  { dataSources: { atomService } }
) => {
  if (ethAddress) {
    return { userId: id, address: ethAddress }
  }
  const wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id, archived: false },
  })

  if (wallet) {
    return { userId: id, address: wallet.address }
  }

  return null
}

export default resolver
