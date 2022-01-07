import { recoverPersonalSignature } from 'eth-sig-util'
import Web3 from 'web3'

import { AUTO_FOLLOW_TAGS, CRYPTO_WALLET_SIGNATURE_STATUS } from 'common/enums'
import { environment } from 'common/environment'
import {
  CodeExpiredError,
  // EntityNotFoundError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
import { getViewerFromUser, setCookie } from 'common/utils'
import {
  // GQLCryptoWalletSignaturePurpose,
  AuthMode,
  MutationToWalletLoginResolver,
} from 'definitions'

const resolver: MutationToWalletLoginResolver = async (
  _, // root
  { input: { ethAddress, nonce, signedMessage, signature } },
  context // { viewer, req, res, dataSources: { userService, atomService, systemService } }
) => {
  const {
    viewer,
    req,
    res,
    dataSources: { userService, atomService, systemService, tagService },
  } = context

  // TODO: check viewer to connect wallet if already has a user

  if (!ethAddress || !Web3.utils.isAddress(ethAddress)) {
    throw new UserInputError('address is invalid')
  }

  const sig_table = 'crypto_wallet_signature'

  const lastSigning = await atomService.findFirst({
    table: sig_table,
    where: {
      address: ethAddress,
      nonce,
      status: CRYPTO_WALLET_SIGNATURE_STATUS.active,
      // purpose: GQLCryptoWalletSignaturePurpose.signup,
    },
    orderBy: [{ column: 'id', order: 'desc' }],
  })

  if (!lastSigning) {
    throw new EthAddressNotFoundError(
      `wallet signing for "${ethAddress}" not found`
    )
  }

  console.log(new Date(), 'lastSigning:', lastSigning)

  if (lastSigning.expiredAt < new Date()) {
    await atomService.update({
      table: sig_table,
      where: {
        id: lastSigning.id,
        // purpose: GQLCryptoWalletSignaturePurpose.signup,
      },
      data: {
        status: CRYPTO_WALLET_SIGNATURE_STATUS.expired,
      },
    })

    throw new CodeExpiredError('signing request has exipred')
  }

  // verify signature
  const verifiedAddress = recoverPersonalSignature({
    data: signedMessage,
    sig: signature,
  })

  if (ethAddress.toLowerCase() !== verifiedAddress) {
    throw new UserInputError('signature is not valid')
  }

  // const user = userService.findByEthAddress(ethAddress)

  const archivedCallback = async () =>
    systemService.saveAgentHash(viewer.agentHash || '')

  const tryLogin = async () => {
    const { token, user } = await userService.loginByEthAddress({
      // ...input,
      ethAddress, // : verifiedAddress,
      archivedCallback,
    })

    setCookie({ req, res, token, user })

    context.viewer = await getViewerFromUser(user)
    context.viewer.authMode = user.role as AuthMode
    context.viewer.scope = {}

    await atomService.update({
      table: sig_table,
      where: {
        id: lastSigning.id,
        // purpose: GQLCryptoWalletSignaturePurpose.signup,
      },
      data: {
        address: ethAddress,
        signedMessage,
        signature,
        userId: user.id,
        updatedAt: new Date(),
        // expiredAt: null, // check if expired before reset to null
        status: CRYPTO_WALLET_SIGNATURE_STATUS.used,
        usedAt: new Date(),
      },
    })

    return { token, auth: true }
  }

  // try Login if already exists
  try {
    return await tryLogin()
  } catch (err) {
    console.error(new Date(), 'ERROR:', err)

    // if no such ethAddress
    if (err instanceof EthAddressNotFoundError) {
      // console.error(new Date(), 'ERROR:', err)
    } else {
      throw err
    }
  }

  // Signup otherwise
  const newUser = await userService.create({
    userName: ethAddress,
    ethAddress: verifiedAddress, // save the lower case ones
  })

  // auto follow matty
  await userService
    .follow(newUser.id, environment.mattyId)
    .then((err) => console.error(new Date(), 'follow matty failed:', err))

  // auto follow tags
  await tagService.followTags(newUser.id, AUTO_FOLLOW_TAGS)

  // skip notification email, there's no email yet

  return tryLogin()
}

export default resolver
