import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { VERIFICATION_CODE_TYPE, AUTH_RESULT_TYPE } from 'common/enums'
import {
  EmailInvalidError,
  PasswordInvalidError,
  CodeInvalidError,
} from 'common/errors'
import { isValidEmail, setCookie, getViewerFromUser } from 'common/utils'

const resolver: GQLMutationResolvers['emailLogin'] = async (
  _,
  { input: { email: rawEmail, passwordOrCode } },
  context
) => {
  const {
    viewer,
    dataSources: { tagService, userService, systemService },
    req,
    res,
  } = context

  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }
  const user = await userService.findByEmail(email)

  if (user === undefined) {
    // user not exist,  register
    const verifyOTP = userService.verifyVerificationCode({
      email,
      type: VERIFICATION_CODE_TYPE.email_otp,
      code: passwordOrCode,
    })
    const verifyRegister = userService.verifyVerificationCode({
      email,
      type: VERIFICATION_CODE_TYPE.register,
      code: passwordOrCode,
    })

    try {
      await Promise.any([verifyOTP, verifyRegister])
    } catch (err: any) {
      for (const e of err.errors) {
        // CodeInvalidError is last error to throw
        if (!(e instanceof CodeInvalidError)) {
          throw e
        }
      }
      throw err.errors[0]
    }

    const newUser = await userService.create({
      email,
    })
    await userService.postRegister(newUser, { tagService })

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
    const verifyPassword = userService.verifyPassword({
      password: passwordOrCode,
      hash: user.passwordHash || '',
    })
    const verifyOTP = userService.verifyVerificationCode({
      email,
      type: VERIFICATION_CODE_TYPE.email_otp,
      code: passwordOrCode,
    })

    try {
      await Promise.any([verifyPassword, verifyOTP])
    } catch (err: any) {
      for (const e of err.errors) {
        // CodeInvalidError is last error to throw
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
