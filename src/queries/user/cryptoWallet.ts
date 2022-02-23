import { UserInfoToCryptoWalletResolver } from 'definitions'

const resolver: UserInfoToCryptoWalletResolver = async (
  { id },
  _,
  { dataSources: { userService, atomService } }
) => {
  if (id === undefined) {
    return null
  }

  const user = await userService.baseFindById(id)
  if (user.ethAddress) {
    // fake a crypto_wallet
    return { userId: id, address: user.ethAddress }
  }

  const wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id, archived: false },
  })

  return wallet
}

export default resolver
