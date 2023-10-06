import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  AUTH_RESULT_TYPE,
  VERIFICATION_CODE_TYPE,
  NODE_TYPES,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from 'common/enums'
import { EmailInvalidError, ForbiddenByStateError } from 'common/errors'
import { auditLog } from 'common/logger'
import { isValidEmail, setCookie, getViewerFromUser } from 'common/utils'
import { checkIfE2ETest, throwIfE2EMagicToken } from 'common/utils/e2e'
import { Passphrases } from 'connectors/passphrases'

const resolver: GQLMutationResolvers['emailLogin'] = async (
  root,
  args,
  context,
  info
) => {
  let result
  const getAction = (res: any) =>
    res?.type === AUTH_RESULT_TYPE.Signup
      ? (res as any).isEmailOTP
        ? AUDIT_LOG_ACTION.emailSignupOTP
        : AUDIT_LOG_ACTION.emailSignup
      : (res as any).isEmailOTP
      ? AUDIT_LOG_ACTION.emailLoginOTP
      : AUDIT_LOG_ACTION.emailLogin
  try {
    result = await _resolver(root, args, context, info)
    return result
  } catch (err: any) {
    auditLog({
      actorId: null,
      action: getAction(result),
      status: AUDIT_LOG_STATUS.failed,
      remark: err.message,
    })
    throw err
  } finally {
    auditLog({
      actorId: null,
      action: getAction(result),
      status: AUDIT_LOG_STATUS.succeeded,
    })
  }
}

const _resolver: Exclude<
  GQLMutationResolvers['emailLogin'],
  undefined
> = async (
  _,
  { input: { email: rawEmail, passwordOrCode, language } },
  context
) => {
  const {
    viewer,
    dataSources: {
      userService,
      systemService,
      connections: { redis },
    },
    req,
    res,
  } = context

  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }
  const user = await userService.findByEmail(email)
  if (user?.state === 'archived') {
    throw new ForbiddenByStateError('email is archived')
  }

  const passphrases = new Passphrases()
  const isEmailOTP = passphrases.isValidPassphrases(passwordOrCode)

  const isE2ETest = checkIfE2ETest(email)

  if (isE2ETest) {
    throwIfE2EMagicToken(passwordOrCode)
  }

  if (user === undefined) {
    // user not exist, register
    if (!isE2ETest) {
      if (isEmailOTP) {
        try {
          await passphrases.verify({
            payload: { email },
            passphrases: passphrases.normalize(passwordOrCode),
          })
        } catch (err: any) {
          auditLog({
            actorId: null,
            action: AUDIT_LOG_ACTION.emailSignupOTP,
            status: 'failed',
            remark: err.message,
          })
          throw err
        }
      } else {
        await userService.verifyVerificationCode({
          email,
          type: VERIFICATION_CODE_TYPE.register,
          code: passwordOrCode,
        })
      }
    }
    const newUser = await userService.create({
      email,
      emailVerified: true,
      language: language || viewer.language,
    })
    await userService.postRegister(newUser)

    // login user
    const sessionToken = await userService.genSessionToken(newUser.id)
    setCookie({ req, res, token: sessionToken, user: newUser })

    context.viewer = await getViewerFromUser(newUser)
    context.viewer.authMode = newUser.role as AuthMode
    context.viewer.scope = {}

    return {
      token: sessionToken,
      auth: true,
      type: AUTH_RESULT_TYPE.Signup,
      user: newUser,
      isEmailOTP,
    }
  } else {
    // user exists, login
    const verifyOTP = isEmailOTP
      ? passphrases.verify({
          payload: { email, userId: user.id },
          passphrases: passphrases.normalize(passwordOrCode),
        })
      : undefined
    const verifyPassword = userService.verifyPassword({
      password: passwordOrCode,
      hash: user.passwordHash || '',
    })

    try {
      await Promise.any([verifyOTP, verifyPassword].filter(Boolean))
    } catch (err: any) {
      if (isEmailOTP) {
        auditLog({
          actorId: user.id,
          action: AUDIT_LOG_ACTION.emailLoginOTP,
          status: 'failed',
          remark: err.errors[0].message,
        })
      }
      if (!isE2ETest) {
        throw err.errors[0]
      }
    }

    systemService.saveAgentHash(viewer.agentHash || '', email)

    // set email verfied if not and login user
    if (user.emailVerified === false) {
      await userService.baseUpdate(user.id, { emailVerified: true })
      user.emailVerified = true
      invalidateFQC({ node: { type: NODE_TYPES.User, id: user.id }, redis })
    }

    const sessionToken = await userService.genSessionToken(user.id)
    setCookie({ req, res, token: sessionToken, user })

    context.viewer = await getViewerFromUser(user)
    context.viewer.authMode = user.role as AuthMode
    context.viewer.scope = {}

    return {
      token: sessionToken,
      auth: true,
      type: AUTH_RESULT_TYPE.Login,
      user,
      isEmailOTP,
    }
  }
}

export default resolver
