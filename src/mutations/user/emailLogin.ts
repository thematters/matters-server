import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import _isEmpty from 'lodash/isEmpty'

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
  const passphrases = new Passphrases()
  const isEmailOTP = passphrases.isValidPassphrases(args.input.passwordOrCode)
  const getAction = (res: any) =>
    res?.type === AUTH_RESULT_TYPE.Signup
      ? isEmailOTP
        ? AUDIT_LOG_ACTION.emailSignupOTP
        : AUDIT_LOG_ACTION.emailSignup
      : isEmailOTP
      ? AUDIT_LOG_ACTION.emailLoginOTP
      : AUDIT_LOG_ACTION.emailLogin
  let result
  try {
    result = await _resolver(root, args, context, info)
    auditLog({
      actorId: context.viewer.id,
      action: getAction(result),
      status: AUDIT_LOG_STATUS.succeeded,
    })
    return result
  } catch (err: any) {
    const email = args.input.email.toLowerCase()
    const user = await context.dataSources.userService.findByEmail(email)
    auditLog({
      actorId: user?.id || null,
      action: isEmailOTP
        ? user?.id
          ? AUDIT_LOG_ACTION.emailLoginOTP
          : AUDIT_LOG_ACTION.emailSignupOTP
        : user?.id
        ? AUDIT_LOG_ACTION.emailLogin
        : AUDIT_LOG_ACTION.emailSignup,
      status: AUDIT_LOG_STATUS.failed,
      remark: `email: ${email} error message: ${err.message}`,
    })
    throw err
  }
}

const _resolver: Exclude<
  GQLMutationResolvers['emailLogin'],
  undefined
> = async (
  _,
  { input: { email: rawEmail, passwordOrCode, language, referralCode } },
  context
) => {
  const {
    viewer,
    dataSources: {
      userService,
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
        await passphrases.verify({
          payload: { email },
          passphrases: passphrases.normalize(passwordOrCode),
        })
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
      referralCode,
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
      if (!isE2ETest) {
        throw err.errors[0]
      }
    }

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
    }
  }
}

export default resolver
