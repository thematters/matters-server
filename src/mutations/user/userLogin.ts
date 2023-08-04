import type { AuthMode, GQLMutationResolvers } from 'definitions'

import { AUTH_RESULT_TYPE } from 'common/enums'
import { getViewerFromUser, setCookie } from 'common/utils'

const resolver: GQLMutationResolvers['userLogin'] = async (
  _,
  { input },
  context
) => {
  const {
    dataSources: { userService, systemService },
    req,
    res,
  } = context

  const email = input.email.toLowerCase()
  const archivedCallback = async () =>
    systemService.saveAgentHash(context.viewer.agentHash || '', email)
  const { token, user } = await userService.loginByEmail({
    ...input,
    email,
    archivedCallback,
  })

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
