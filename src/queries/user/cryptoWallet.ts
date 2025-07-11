import type { GQLUserInfoResolvers } from '#definitions/index.js'

const resolver: GQLUserInfoResolvers['cryptoWallet'] = async (
  { id, ethAddress },
  _,
  { dataSources: { userService, atomService } }
) => {
  if (ethAddress) {
    return { address: ethAddress }
  }

  if (id === undefined) {
    return null
  }

  const user = await userService.baseFindById(id)
  if (user.ethAddress) {
    // fake a crypto_wallet, use userId as hasNFTs cache layer
    return { id, userId: id, address: user.ethAddress }
  }

  const wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id, archived: false },
  })

  if (wallet) {
    // user.id to override wallet.id
    return { id, userId: id, address: wallet.address }
  }

  return wallet
}

export default resolver
