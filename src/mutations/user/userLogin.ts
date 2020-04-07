import { getViewerFromUser, setCookie } from 'common/utils'
import { MutationToUserLoginResolver, ScopeMode } from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
  { input },
  context
) => {
  const {
    dataSources: { userService, systemService },
    res,
  } = context
  const archivedCallback = async () => systemService.saveAgentHash(context.viewer.agentHash || '')
  const { token, user } = await userService.login({
    ...input,
    email: input.email ? input.email.toLowerCase() : null,
    archivedCallback,
  })

  setCookie({ res, token })

  context.viewer = await getViewerFromUser(user)
  context.viewer.scopeMode = user.role as ScopeMode
  context.viewer.scope = {}

  return { token, auth: true }
}

export default resolver
