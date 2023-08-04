import type { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['cryptoWallet'] = async (
  { id },
  _,
  { dataSources: { userService, atomService } }
) => {
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
    // userId to override id
    return { id, userId: id, address: wallet.address }
  }

  return wallet
}

export default resolver
