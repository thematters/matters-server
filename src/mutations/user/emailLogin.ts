import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { VERIFICATION_CODE_TYPE, AUTH_RESULT_TYPE } from 'common/enums'
import { EmailInvalidError, PasswordInvalidError } from 'common/errors'
import { isValidEmail, setCookie, getViewerFromUser } from 'common/utils'
import { Passphrases } from 'connectors/passphrases'

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

  if (user === undefined) {
    // user not exist, register
    const verifyOTP = isEmailOTP
      ? passphrases.verify({
          payload: { email },
          passphrases: passphrases.normalize(passwordOrCode),
        })
      : undefined
    const verifyRegister = userService.verifyVerificationCode({
      email,
      type: VERIFICATION_CODE_TYPE.register,
      code: passwordOrCode,
    })

    try {
      await Promise.any([verifyOTP, verifyRegister].filter(Boolean))
    } catch (err: any) {
      throw err.errors[0]
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
      for (const e of err.errors) {
        // PasswordInvalidError is last error to throw
        if (!(e instanceof PasswordInvalidError)) {
          throw e
        }
      }
      throw err.errors[0]
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

export default resolver
