import { invalidateFQC } from '@matters/apollo-response-cache'
import { recoverPersonalSignature } from 'eth-sig-util'
import { Knex } from 'knex'
import Web3 from 'web3'

import {
  AUTO_FOLLOW_TAGS,
  NODE_TYPES,
  VERIFICATION_CODE_STATUS,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  CodeInvalidError,
  CryptoWalletExistsError,
  EmailExistsError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
import { getViewerFromUser, setCookie } from 'common/utils'
import { CacheService } from 'connectors'
import {
  AuthMode,
  GQLAuthResultType,
  GQLVerificationCodeType,
  MutationToWalletLoginResolver,
} from 'definitions'

const resolver: MutationToWalletLoginResolver = async (
  _,
  { input: { ethAddress, nonce, signedMessage, signature, email, codeId } },
  context
) => {
  const cacheService = new CacheService()
  const {
    viewer,
    req,
    res,
    dataSources: {
      userService,
      atomService,
      systemService,
      tagService,
      notificationService,
    },
  } = context

  if (!ethAddress || !Web3.utils.isAddress(ethAddress)) {
    throw new UserInputError('address is invalid')
  }

  const sig_table = 'crypto_wallet_signature'

  const lastSigning = await atomService.findFirst({
    table: sig_table,
    where: (builder: Knex.QueryBuilder) =>
      builder
        .where({ address: ethAddress, nonce })
        .whereNull('signature')
        .whereRaw('expired_at > CURRENT_TIMESTAMP'),
    orderBy: [{ column: 'id', order: 'desc' }],
  })

  if (!lastSigning) {
    throw new EthAddressNotFoundError(
      `wallet signing for "${ethAddress}" not found`
    )
  }

  // verify signature
  const verifiedAddress = recoverPersonalSignature({
    data: signedMessage,
    sig: signature,
  })

  if (ethAddress.toLowerCase() !== verifiedAddress.toLowerCase()) {
    throw new UserInputError('signature is not valid')
  }

  /**
   * Link
   */
  if (viewer.id && viewer.token) {
    if (viewer.ethAddress) {
      throw new CryptoWalletExistsError('user already has eth address')
    }

    await atomService.update({
      table: sig_table,
      where: { id: lastSigning.id },
      data: {
        signature,
        userId: viewer.id,
        updatedAt: new Date(),
      },
    })

    await userService.baseUpdate(viewer.id, {
      updatedAt: new Date(),
      ethAddress: verifiedAddress, // save the lower case ones
    })

    await invalidateFQC({
      node: { type: NODE_TYPES.User, id: viewer.id },
      redis: cacheService.redis,
    })

    return {
      token: viewer.token,
      auth: true,
      type: GQLAuthResultType.LinkAccount,
    }
  }

  const archivedCallback = async () =>
    systemService.saveAgentHash(viewer.agentHash || '')

  const tryLogin = async (type: GQLAuthResultType) => {
    const { token, user } = await userService.loginByEthAddress({
      ethAddress,
      archivedCallback,
    })

    setCookie({ req, res, token, user })

    context.viewer = await getViewerFromUser(user)
    context.viewer.authMode = user.role as AuthMode
    context.viewer.scope = {}

    // update crypto_wallet_signature record
    await atomService.update({
      table: sig_table,
      where: { id: lastSigning.id },
      data: {
        signature,
        userId: user.id,
        updatedAt: new Date(),
        expiredAt: null, // check if expired before reset to null
      },
    })

    return { token, auth: true, type }
  }

  /**
   * Login
   */
  if (!email || !codeId) {
    try {
      return await tryLogin(GQLAuthResultType.Login)
    } catch (err) {
      const isNoEthAddress = err instanceof EthAddressNotFoundError
      if (!isNoEthAddress) {
        throw err
      }
    }
  }

  /**
   * SignUp
   */
  if (!email || !codeId) return

  // check verification code
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid: codeId,
      email,
      type: GQLVerificationCodeType.register,
      status: VERIFICATION_CODE_STATUS.verified,
    },
  })

  // check codes
  if (!code) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const otherUser = await userService.findByEmail(email)
  if (otherUser) {
    throw new EmailExistsError('email address has already been registered')
  }

  const userName = await userService.generateUserName(email)
  const newUser = await userService.create({
    userName,
    displayName: userName,
    ethAddress: verifiedAddress, // save the lower case ones
  })

  // auto follow matty
  await userService
    .follow(newUser.id, environment.mattyId)
    .then((err) => console.error(new Date(), 'follow matty failed:', err))

  // auto follow tags
  await tagService.followTags(newUser.id, AUTO_FOLLOW_TAGS)

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  // send email
  notificationService.mail.sendRegisterSuccess({
    to: email,
    recipient: { displayName: userName },
    language: viewer.language,
  })

  return tryLogin(GQLAuthResultType.Signup)
}

export default resolver
