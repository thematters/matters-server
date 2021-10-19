import { recoverPersonalSignature } from 'eth-sig-util'
import Web3 from 'web3'

import {
  AuthenticationError,
  CryptoWalletExistsError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { MutationToPutWalletResolver } from 'definitions'

const resolver: MutationToPutWalletResolver = async (
  _,
  { input: { id, address, signedMessage, signature } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!address || !signedMessage || !signature) {
    throw new UserInputError('parameter is invaid')
  }

  if (!Web3.utils.isAddress(address)) {
    throw new UserInputError('address is invalid')
  }

  // verify signature
  const verifiedAddress = recoverPersonalSignature({
    data: signedMessage,
    sig: signature,
  })

  if (address.toLowerCase() !== verifiedAddress) {
    throw new UserInputError('signature is invalid')
  }

  let wallet
  const table = 'crypto_wallet'

  if (id) {
    // replace connected wallet
    const item = await atomService.findFirst({
      table,
      where: { id, userId: viewer.id },
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

  // TODO: send email if it's successful

  return wallet
}

export default resolver
