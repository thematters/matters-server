import type { AuthMode, GQLMutationResolvers } from 'definitions'

import { AUTH_RESULT_TYPE } from 'common/enums'
import { getViewerFromUser, setCookie } from 'common/utils'

const resolver: GQLMutationResolvers['userLogin'] = async (
  _,
  { input: { email: rawEmail, password } },
  context
) => {
  const {
    dataSources: { userService, systemService },
    req,
    res,
  } = context

  const email = rawEmail.toLowerCase()
  const archivedCallback = async () =>
    systemService.saveAgentHash(context.viewer.agentHash || '', email)
  const { token, user } = await userService.loginByEmail({
    email,
    password,
    archivedCallback,
  })
  await userService.verifyPassword({ password, hash: user.passwordHash })

  setCookie({ req, res, token, user })

  context.viewer = await getViewerFromUser(user)
  context.viewer.authMode = user.role as AuthMode
  context.viewer.scope = {}

  return {
    token,
    auth: true,
    type: AUTH_RESULT_TYPE.Login,
    user,
  }
}

export default resolver
