import type { GQLMutationResolvers, User } from 'definitions'

import {
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPE,
  AUTH_RESULT_TYPE,
} from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  EmailExistsError,
  EmailInvalidError,
} from 'common/errors'
import { isValidEmail, setCookie } from 'common/utils'

const resolver: GQLMutationResolvers['emailLogin'] = async (
  _,
  { input: { email: rawEmail, type, token } },
  { viewer, dataSources: { tagService, userService, systemService }, req, res }
) => {
  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }

  let user: User
  if (type === 'register') {
    const codes = await userService.findVerificationCodes({
      where: {
        uuid: token,
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

    user = await userService.create({
      email,
    })
    await userService.postRegister(user, { tagService })

    // mark code status as used
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: VERIFICATION_CODE_STATUS.used,
    })
  } else {
    // login
    user = await userService.findByEmail(email)
    await userService.verifyPassword({
      password: token,
      hash: user.passwordHash,
    })
    systemService.saveAgentHash(viewer.agentHash || '', email)
  }

  // login user
  const sessionToken = await userService.genSessionToken(user.id)
  setCookie({ req, res, token: sessionToken, user })

  return {
    token,
    auth: true,
    type:
      type === 'register' ? AUTH_RESULT_TYPE.Signup : AUTH_RESULT_TYPE.Login,
    user,
  }
}

export default resolver
