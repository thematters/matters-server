import web3 from 'web3'

import { NODE_TYPES } from 'common/enums'
import {
  AuthenticationError,
  CryptoWalletExistsError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { toGlobalId } from 'common/utils'
import { MutationToPutWalletResolver } from 'definitions'

const resolver: MutationToPutWalletResolver = async (
  _,
  { input: { id, address } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!address) {
    throw new UserInputError('address is required')
  }

  if (!web3.utils.isAddress(address)) {
    throw new UserInputError('address is invalid')
  }

  let wallet
  const table = 'crypto_wallet'

  if (id) {
    // replace connected wallet
    const item = await atomService.findUnique({
      table,
      where: { id },
    })

    if (!item) {
      throw new EntityNotFoundError('wallet not found')
    }

    wallet = await atomService.update({
      table,
      where: { id, userId: viewer.id },
      data: { address },
    })
  } else {
    // connect a wallet
    const [hasWallet, hasSameWallet] = await Promise.all([
      atomService.findFirst({
        table,
        where: { userId: viewer.id },
      }),
      atomService.findFirst({
        table,
        where: { address },
      }),
    ])

    if (hasWallet || hasSameWallet) {
      throw new CryptoWalletExistsError('wallet exists')
    }

    wallet = await atomService.create({
      table,
      data: { userId: viewer.id, address },
    })
  }

  if (wallet) {
    wallet = {
      ...wallet,
      id: toGlobalId({ type: NODE_TYPES.CryptoWallet, id: wallet.id }),
    }
  }

  return wallet
}

export default resolver
