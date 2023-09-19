import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  VERIFICATION_CODE_TYPE,
  AUTH_RESULT_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { ForbiddenError, UserNotFoundError } from 'common/errors'
import { setCookie, getViewerFromUser } from 'common/utils'
import { checkIfE2ETest, throwIfE2EMagicToken } from 'common/utils/e2e'

const resolver: GQLMutationResolvers['verifyEmail'] = async (
  _,
  { input: { email: rawEmail, code } },
  context
) => {
  const {
    dataSources: {
      userService,
      connections: { redis },
    },
    viewer,
    req,
    res,
  } = context
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
      userId: user.id,
    })
  }

  const updatedUser = await userService.baseUpdate(user.id, {
    email: user.email,
    emailVerified: true,
  })

  invalidateFQC({
    node: { type: NODE_TYPES.User, id: user.id },
    redis,
  })

  let auth = false
  let token = null
  if (viewer.id !== user.id) {
    context.viewer = await getViewerFromUser(user)
    context.viewer.authMode = user.role as AuthMode
    context.viewer.scope = {}
    auth = true
    token = await userService.genSessionToken(user.id)
    setCookie({ req, res, token, user })
  }

  return {
    token,
    auth,
    type: AUTH_RESULT_TYPE.LinkAccount,
    user: updatedUser,
  }
}

export default resolver
