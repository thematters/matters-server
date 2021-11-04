import { UserInfoToCryptoWalletResolver } from 'definitions'

const resolver: UserInfoToCryptoWalletResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (id === undefined) {
    return null
  }

  const wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id, archived: false },
  })

  return wallet
}

export default resolver
