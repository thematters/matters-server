import type {
  AuthMode,
  GQLAuthResultType,
  GQLMutationResolvers,
  User,
} from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import { Hex } from 'viem'

import {
  NODE_TYPES,
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPE,
  AUTH_RESULT_TYPE,
  SIGNING_MESSAGE_PURPOSE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  EmailExistsError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
import { auditLog } from 'common/logger'
import { getViewerFromUser, setCookie } from 'common/utils'

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
  {
    input: {
      ethAddress,
      nonce,
      signedMessage,
      signature,
      email,
      codeId,
      language,
    },
  },
  context
) => {
  const {
    viewer,
    req,
    res,
    dataSources: {
      userService,
      atomService,
      systemService,
      connections: { knex, redis },
    },
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

  /**
   * Link
   */
  if (viewer.id && viewer.token && !viewer.ethAddress) {
    await atomService.update({
      table: sigTable,
      where: { id: lastSigning.id },
      data: {
        signature,
        userId: viewer.id,
        updatedAt: knex.fn.now(),
      },
    })

    await userService.addWallet(viewer.id, ethAddress)

    await invalidateFQC({
      node: { type: NODE_TYPES.User, id: viewer.id },
      redis,
    })

    return {
      token: viewer.token,
      auth: true,
      type: AUTH_RESULT_TYPE.LinkAccount,
      user: viewer,
    }
  }

  const archivedCallback = async () =>
    systemService.saveAgentHash(viewer.agentHash || '')

  const tryLogin = async (type: GQLAuthResultType, loginUser: User) => {
    const { token } = await userService.loginByEthAddress({
      ethAddress,
      archivedCallback,
    })
    setCookie({ req, res, token, user: loginUser })

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

    return { token, auth: true, type, user: loginUser }
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
    if (email) {
      if (!codeId) {
        throw new UserInputError('email and codeId are required')
      }
      // check verification code
      const codes = await userService.findVerificationCodes({
        where: {
          uuid: codeId,
          email,
          type: VERIFICATION_CODE_TYPE.register,
        },
      })
      const code = codes?.length > 0 ? codes[0] : {}

      // check code
      if (code.status === VERIFICATION_CODE_STATUS.expired) {
        throw new CodeExpiredError('code is expired')
      }
      if (code.status === VERIFICATION_CODE_STATUS.inactive) {
        throw new CodeInactiveError('code is retired')
      }
      if (code.status !== VERIFICATION_CODE_STATUS.verified) {
        throw new CodeInvalidError('code does not exists')
      }

      // check email
      const otherUser = await userService.findByEmail(email)
      if (otherUser) {
        throw new EmailExistsError('email address has already been registered')
      }

      const userName = await userService.generateUserName(email)
      user = await userService.create({
        email,
        userName,
        displayName: userName,
        ethAddress: ethAddress.toLowerCase(), // save the lower case ones
        language: language || viewer.language,
      })
      // mark code status as used
      await userService.postRegister(user)
      await userService.markVerificationCodeAs({
        codeId: code.id,
        status: VERIFICATION_CODE_STATUS.used,
      })
    } else {
      user = await userService.create({
        ethAddress: ethAddress.toLowerCase(),
        language: language || viewer.language,
      })
      await userService.postRegister(user)
    }
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
