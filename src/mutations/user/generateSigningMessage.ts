import { utils } from 'ethers'
import { customAlphabet } from 'nanoid'

import { environment } from 'common/environment'
import { UserInputError } from 'common/errors'
import { GQLSigningMessagePurpose, GQLMutationResolvers } from 'definitions'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

const resolver: GQLMutationResolvers['generateSigningMessage'] = async (
  _,
  { input: { address, purpose } },
  { dataSources: { atomService } }
) => {
  // check address is a valid one,
  if (!address || !utils.isAddress(address)) {
    throw new UserInputError('address is invalid')
  }

  const table = 'crypto_wallet_signature'

  // e.g. 'ek4j3nbum7ql'
  const nonce = nanoid()
  const createdAt = new Date()
  const expiredAt = new Date(+createdAt + 10 * 60e3) // 10 minutes

  // create the message to be sign'ed
  const signingMessage = `${
    environment.siteDomain
  } wants you to sign in with your Ethereum account:
${address}

I accept the Matters Terms of Service: https://${environment.siteDomain}/tos

URI: https://${environment.siteDomain}/login
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${createdAt.toISOString()}
Expiration Time: ${expiredAt.toISOString()}
Resources:
- https://${environment.siteDomain}/about
- https://${environment.siteDomain}/community
- https://${environment.siteDomain}/guide`

  if (!purpose) {
    // and not already in-use by anyone
    const lastUsed = await atomService.findFirst({
      table,
      where: { address, purpose: GQLSigningMessagePurpose.signup },
      orderBy: [{ column: 'id', order: 'desc' }],
    })
    purpose = lastUsed?.userId
      ? GQLSigningMessagePurpose.login
      : GQLSigningMessagePurpose.signup
  }

  await atomService.create({
    table,
    data: {
      address,
      signedMessage: signingMessage,
      nonce,
      purpose,
      createdAt,
      expiredAt,
    },
  })

  return {
    nonce,
    purpose,
    signingMessage,
    createdAt,
    expiredAt,
  }
}

export default resolver
