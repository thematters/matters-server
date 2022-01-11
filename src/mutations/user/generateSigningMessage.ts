// import { recoverPersonalSignature } from 'eth-sig-util'
import { customAlphabet } from 'nanoid'
import Web3 from 'web3'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

import {
  CRYPTO_SIGNATURE_TIMEOUT,
  CRYPTO_WALLET_SIGNATURE_STATUS,
} from 'common/enums'
import { UserInputError } from 'common/errors'
import {
  GQLCryptoWalletSignaturePurpose,
  MutationToGenerateSigningMessageResolver,
} from 'definitions'

// const addressRegex = /0x[a-zA-Z0-9]{40}/

const resolver: MutationToGenerateSigningMessageResolver = async (
  _, // root
  { address },
  { viewer, dataSources: { atomService } }
) => {
  // TODO: check address is a valid one,
  if (!address || !Web3.utils.isAddress(address)) {
    throw new UserInputError('address is invalid')
  }

  const table = 'crypto_wallet_signature'

  // and not already in-use by anyone

  const lastUsed = await atomService.findFirst({
    table,
    where: {
      address,
      purpose: GQLCryptoWalletSignaturePurpose.signup,
      // orderBy: [{column: 'id', order: 'desc'}],
    },
    orderBy: [{ column: 'id', order: 'desc' }],
  })

  // e.g. 'ek4j3nbum7ql'
  const nonce = nanoid()

  const createdAt = new Date()
  const expiredAt = new Date(+createdAt + CRYPTO_SIGNATURE_TIMEOUT) // 10 minutes

  // create the message to be sign'ed
  const signingMessage = `Matters.News wants you to sign in with your Ethereum account:
${address}

I accept the Matters.News Terms of Service: https://matters.news/tos

URI: https://matters.news/login
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${createdAt.toISOString()}
Expiration Time: ${expiredAt.toISOString()}
Resources:
- https://matters.news/community
- ...`

  console.log(new Date(), 'lastUsed:', lastUsed)

  const purpose = lastUsed?.userId
    ? GQLCryptoWalletSignaturePurpose.login
    : GQLCryptoWalletSignaturePurpose.signup // or login, if already have this address signup before

  // retire old active codes
  await atomService.updateMany({
    table,
    where: {
      address,
      // status: CRYPTO_WALLET_SIGNATURE_STATUS.active,
    },
    data: {
      status: CRYPTO_WALLET_SIGNATURE_STATUS.inactive,
      updatedAt: new Date(),
    },
  })

  const res = await atomService.create({
    table,
    data: {
      address,
      signedMessage: signingMessage,
      nonce,
      purpose,
      status: CRYPTO_WALLET_SIGNATURE_STATUS.active,
      createdAt,
      expiredAt,
    },
  })

  // check res: no error
  console.log('created signup/login:', res)

  return {
    nonce,
    signingMessage,
    createdAt,
    expiredAt,
  }
}

export default resolver
