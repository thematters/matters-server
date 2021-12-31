import {
  GQLCryptoWalletSignaturePurpose,
  MutationToGenerateSigningMessageResolver,
} from 'definitions'

const addressRegex = /0x[a-zA-Z0-9]{40}/

const resolver: MutationToGenerateSigningMessageResolver = async (
  _, // root
  { address },
  { viewer, dataSources: { atomService } }
) => {
  // TODO: check address is a valid one,

  // and not already in-use by anyone

  const table = 'crypto_wallet_signature'

  // e.g. 'd546iv2c'
  const nonce = Math.random().toString(36).substr(3, 8)

  const issuedAt = new Date()
  const expirationTime = new Date(+issuedAt + 600 * 1000)

  // create the message to be sign'ed
  const signedMessage = `Matters.News wants you to sign in with your Ethereum account:
${address}

I accept the Matters.News Terms of Service: https://matters.news/tos

URI: https://matters.news/login
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${issuedAt.toISOString()}
Expiration Time: ${expirationTime.toISOString()}
Resources:
- https://matters.news/community
- ...`

  const purpose = GQLCryptoWalletSignaturePurpose.signup // or login, if already have this address signup before

  const res = await atomService.create({
    table,
    data: { address, signedMessage, purpose },
  })

  // check res: no error
  console.log('created signup/login:', res)

  return signedMessage
}

export default resolver
