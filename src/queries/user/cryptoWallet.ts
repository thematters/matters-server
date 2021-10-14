import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { UserInfoToCryptoWalletResolver } from 'definitions'

const resolver: UserInfoToCryptoWalletResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (id === undefined) {
    return null
  }

  let wallet = await atomService.findFirst({
    table: 'crypto_wallet',
    where: { userId: id },
  })

  if (wallet) {
    wallet = {
      ...wallet,
      id: toGlobalId({ type: NODE_TYPES.CryptoWallet, id: wallet.id }),
    }
  }

  return wallet
}

export default resolver
