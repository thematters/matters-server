import type { GQLMutationResolvers } from 'definitions'

import { VERIFICATION_CODE_TYPE } from 'common/enums'
import { ForbiddenError } from 'common/errors'

const resolver: GQLMutationResolvers['verifyEmail'] = async (
  _,
  { input: { code } },
  { dataSources: { userService }, viewer }
) => {
  if (!viewer.email) {
    throw new ForbiddenError('email is not set')
  }

  if (viewer.emailVerified) {
    throw new ForbiddenError('email is already verified')
  }

  await userService.verifyVerificationCode({
    code,
    type: VERIFICATION_CODE_TYPE.email_verify,
    email: viewer.email,
  })

  return userService.baseUpdate(viewer.id, { emailVerified: true })
}

export default resolver
