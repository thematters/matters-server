import { getViewerFromUser, setCookie } from 'common/utils/index.js'
import {
  AuthMode,
  GQLAuthResultType,
  MutationToUserLoginResolver,
} from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
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
    type: GQLAuthResultType.Login,
    user,
  }
}

export default resolver
