import type {
  AuthMode,
  GQLAuthResultType,
  GQLMutationResolvers,
  User,
} from '#definitions/index.js'

import {
  AUTH_RESULT_TYPE,
  SIGNING_MESSAGE_PURPOSE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from '#common/enums/index.js'
import { EthAddressNotFoundError, UserInputError } from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { getViewerFromUser, setCookie } from '#common/utils/index.js'
import { Hex } from 'viem'

const sigTable = 'crypto_wallet_signature'

export const walletLogin: GQLMutationResolvers['walletLogin'] = async (
  root,
  args,
  context,
  info
) => {
  let result
  const getAction = (res: any) =>
    res?.type === AUTH_RESULT_TYPE.Signup
      ? AUDIT_LOG_ACTION.walletSignup
      : AUDIT_LOG_ACTION.walletLogin
  try {
    result = await _walletLogin(root, args, context, info)
    auditLog({
      actorId: context.viewer.id,
      action: getAction(result),
      status: AUDIT_LOG_STATUS.succeeded,
    })
    return result
  } catch (err: any) {
    const user = await context.dataSources.userService.findByEthAddress(
      args.input.ethAddress
    )
    auditLog({
      actorId: user?.id || null,
      action: user?.id
        ? AUDIT_LOG_ACTION.walletLogin
        : AUDIT_LOG_ACTION.walletSignup,
      status: AUDIT_LOG_STATUS.failed,
      remark: `eth address: ${args.input.ethAddress} error message: ${err.message}`,
    })
    throw err
  }
}

const _walletLogin: Exclude<
  GQLMutationResolvers['walletLogin'],
  undefined
> = async (
  _,
  { input: { ethAddress, nonce, signedMessage, signature, language } },
  context
) => {
  const {
    viewer,
    req,
    res,
    dataSources: { userService, atomService, systemService },
  } = context

  const lastSigning = await userService.verifyWalletSignature({
    ethAddress,
    nonce,
    signedMessage: signedMessage as Hex,
    signature: signature as Hex,
    validPurposes: [
      SIGNING_MESSAGE_PURPOSE.signup,
      SIGNING_MESSAGE_PURPOSE.login,
      SIGNING_MESSAGE_PURPOSE.connect,
    ],
  })

  const archivedCallback = async () =>
    systemService.saveAgentHash(viewer.agentHash || '')

  const tryLogin = async (type: GQLAuthResultType, loginUser: User) => {
    const { accessToken, refreshToken } = await userService.loginByEthAddress({
      viewer,
      ethAddress,
      archivedCallback,
    })

    setCookie({ req, res, accessToken, refreshToken, user: loginUser })

    context.viewer = await getViewerFromUser(loginUser)
    context.viewer.authMode = loginUser.role as AuthMode
    context.viewer.scope = {}

    // update crypto_wallet_signature record
    await atomService.update({
      table: sigTable,
      where: { id: lastSigning.id },
      data: {
        signature,
        userId: loginUser.id,
        updatedAt: new Date(),
        expiredAt: null, // check if expired before reset to null
      },
    })

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      auth: true,
      type,
      user: loginUser,
    }
  }

  let user = await userService.findByEthAddress(ethAddress)

  if (user) {
    // login
    try {
      return await tryLogin(AUTH_RESULT_TYPE.Login, user)
    } catch (err) {
      const isNoEthAddress = err instanceof EthAddressNotFoundError
      if (!isNoEthAddress) {
        throw err
      }
    }
  } else {
    // signup
    user = await userService.create({
      ethAddress: ethAddress.toLowerCase(),
      language: language || viewer.language,
    })
    await userService.postRegister(user)
  }
  return tryLogin(AUTH_RESULT_TYPE.Signup, user)
}

export const addWalletLogin: GQLMutationResolvers['addWalletLogin'] = async (
  _,
  { input: { ethAddress, nonce, signedMessage, signature } },
  { viewer, dataSources: { userService } }
) => {
  if (viewer.ethAddress) {
    throw new UserInputError('User has already linked a wallet')
  }
  await userService.verifyWalletSignature({
    ethAddress,
    nonce,
    signedMessage: signedMessage as Hex,
    signature: signature as Hex,
    validPurposes: [SIGNING_MESSAGE_PURPOSE.connect],
  })
  return userService.addWallet(viewer.id, ethAddress)
}

export const removeWalletLogin: GQLMutationResolvers['removeWalletLogin'] =
  async (_, __, { viewer, dataSources: { userService } }) => {
    return userService.removeWallet(viewer.id)
  }
