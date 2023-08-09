import type { GQLMutationResolvers } from 'definitions'

import { VERIFICATION_CODE_TYPE, AUTH_RESULT_TYPE } from 'common/enums'
import {
  EmailExistsError,
  EmailInvalidError,
  PasswordInvalidError,
} from 'common/errors'
import { isValidEmail, setCookie } from 'common/utils'

const resolver: GQLMutationResolvers['emailLogin'] = async (
  _,
  { input: { email: rawEmail, type, passwordOrCode } },
  { viewer, dataSources: { tagService, userService, systemService }, req, res }
) => {
  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }
  const user = await userService.findByEmail(email)

  if (user === undefined) {
    // user not exist,  register
    await userService.verifyVerificationCode({
      email,
      type:
        type === 'register'
          ? VERIFICATION_CODE_TYPE.register
          : VERIFICATION_CODE_TYPE.email_otp,
      code: passwordOrCode,
    })

    const newUser = await userService.create({
      email,
    })
    await userService.postRegister(newUser, { tagService })

    // login user
    const sessionToken = await userService.genSessionToken(newUser.id)
    setCookie({ req, res, token: sessionToken, user: newUser })

    return {
      token: sessionToken,
      auth: true,
      type: AUTH_RESULT_TYPE.Signup,
      user: newUser,
    }
  } else {
    // user exists, login
    if (type === 'register') {
      throw new EmailExistsError('email address has already been registered')
    }

    const verifyPassword = userService.verifyPassword({
      password: passwordOrCode,
      hash: user.passwordHash,
    })
    const verifyOTP = userService.verifyVerificationCode({
      email,
      type: VERIFICATION_CODE_TYPE.email_otp,
      code: passwordOrCode,
    })

    try {
      await Promise.any([verifyPassword, verifyOTP])
    } catch (e) {
      console.error(e)
      throw new PasswordInvalidError('Password incorrect, login failed.')
    }

    systemService.saveAgentHash(viewer.agentHash || '', email)

    // set email verfied if not and login user
    if (user.emailVerified === false) {
      await userService.baseUpdate(user.id, { emailVerified: true })
      user.emailVerified = true
    }

    const sessionToken = await userService.genSessionToken(user.id)
    setCookie({ req, res, token: sessionToken, user })

    return {
      token: sessionToken,
      auth: true,
      type: AUTH_RESULT_TYPE.Login,
      user,
    }
  }
}

export default resolver
