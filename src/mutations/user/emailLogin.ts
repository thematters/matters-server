import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { AUTH_RESULT_TYPE, VERIFICATION_CODE_TYPE } from 'common/enums'
import { checkIfE2ETest } from 'common/environment'
import {
  EmailInvalidError,
  PasswordInvalidError,
  CodeExpiredError,
  CodeInvalidError,
  UnknownError,
  CodeInactiveError,
} from 'common/errors'
import { isValidEmail, setCookie, getViewerFromUser } from 'common/utils'
import { Passphrases } from 'connectors/passphrases'

const PASSPHREASE_EXPIRED = 'e2ets-loent-loent-loent-loent-expir'
const PASSPHREASE_MISMATCH = 'e2ets-loent-loent-loent-loent-misma'
const PASSPHREASE_UNKNOWN = 'e2ets-loent-loent-loent-loent-unkno'
const REGISTER_CODE_NOT_EXIST = 'e2etest_code_not_exists'
const REGISTER_CODE_RETIRED = 'e2etest_code_retired'
const REGISTER_CODE_EXPIRED = 'e2etest_code_expired'

const resolver: GQLMutationResolvers['emailLogin'] = async (
  _,
  { input: { email: rawEmail, passwordOrCode } },
  context
) => {
  const {
    viewer,
    dataSources: { userService, systemService },
    req,
    res,
  } = context

  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }
  const user = await userService.findByEmail(email)
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

    systemService.saveAgentHash(viewer.agentHash || '', email)

    // set email verfied if not and login user
    if (user.emailVerified === false) {
      await userService.baseUpdate(user.id, { emailVerified: true })
      user.emailVerified = true
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

const throwIfE2EMagicToken = (token: string) => {
  if (token === PASSPHREASE_EXPIRED) {
    throw new CodeExpiredError('passphrases expired')
  } else if (token === PASSPHREASE_MISMATCH) {
    throw new CodeInvalidError('passphrases mismatch')
  } else if (token === PASSPHREASE_UNKNOWN) {
    throw new UnknownError('unknown error')
  } else if (token === REGISTER_CODE_NOT_EXIST) {
    throw new CodeInvalidError('code does not exists')
  } else if (token === REGISTER_CODE_RETIRED) {
    throw new CodeInactiveError('code is retired')
  } else if (token === REGISTER_CODE_EXPIRED) {
    throw new CodeExpiredError('code is expired')
  }
}

export default resolver
