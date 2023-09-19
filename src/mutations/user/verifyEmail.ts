import type { GQLMutationResolvers } from 'definitions'

import { VERIFICATION_CODE_TYPE } from 'common/enums'
import { ForbiddenError, UserNotFoundError } from 'common/errors'
import { checkIfE2ETest, throwIfE2EMagicToken } from 'common/utils/e2e'

const resolver: GQLMutationResolvers['verifyEmail'] = async (
  _,
  { input: { email: rawEmail, code } },
  { dataSources: { userService } }
) => {
  const email = rawEmail.toLowerCase()

  const user = await userService.findByEmail(email)

  if (!user) {
    throw new UserNotFoundError('user not found')
  }

  if (user.emailVerified) {
    throw new ForbiddenError('email is already verified')
  }

  const isE2ETest = checkIfE2ETest(email)
  if (isE2ETest) {
    throwIfE2EMagicToken(code)
  } else {
    await userService.verifyVerificationCode({
      code,
      type: VERIFICATION_CODE_TYPE.email_verify,
      email: email,
    })
  }

  return userService.baseUpdate(user.id, {
    email: user.email,
    emailVerified: true,
  })
}

export default resolver
