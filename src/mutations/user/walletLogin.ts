import { recoverPersonalSignature } from 'eth-sig-util'
import Web3 from 'web3'

import { AUTO_FOLLOW_TAGS } from 'common/enums'
import { environment } from 'common/environment'
import {
  EntityNotFoundError,
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
      ethAddress,
      nonce,
      // purpose: GQLCryptoWalletSignaturePurpose.signup,
    },
    orderBy: [{ column: 'id', order: 'desc' }],
  })

  if (!lastSigning) {
    throw new EntityNotFoundError('wallet not found')
  }

  // TODO: check if expired

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

    // TODO: update crypto_wallet_signature record
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
        expiredAt: null, // check if expired before reset to null
      },
    })

    return { token, auth: true }
  }

  // try Login if already exists
  try {
    return await tryLogin()
  } catch (err) {
    // if no such ethAddress
    if (err instanceof EthAddressNotFoundError) {
      console.error(new Date(), 'ERROR:', err)
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
  await userService.follow(newUser.id, environment.mattyId)

  // auto follow tags
  const items = await Promise.all(
    AUTO_FOLLOW_TAGS.map((content) => tagService.findByContent({ content }))
  )
  await Promise.all(
    items.map((tags) => {
      const tag = tags[0]
      if (tag) {
        return tagService.follow({ targetId: tag.id, userId: newUser.id })
      }
    })
  )

  if (environment.mattyChoiceTagId) {
    await tagService.follow({
      targetId: environment.mattyChoiceTagId,
      userId: newUser.id,
    })
  }

  // skip notification email

  return tryLogin()
}

export default resolver
