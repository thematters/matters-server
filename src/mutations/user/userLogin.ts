import { USER_STATE } from 'common/enums'
import { UserNotFoundError } from 'common/errors'
import { getViewerFromUser, setCookie } from 'common/utils'
import { MutationToUserLoginResolver, ScopeMode } from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
  { input },
  context
) => {
  const {
    dataSources: { userService },
    res
  } = context
  const { token, user } = await userService.login({
    ...input,
    email: input.email ? input.email.toLowerCase() : null
  })

  if (user.state === USER_STATE.archived) {
    throw new UserNotFoundError('login user does not exists')
  }

  setCookie({ res, token })

  context.viewer = await getViewerFromUser(user)
  context.viewer.scopeMode = user.role as ScopeMode
  context.viewer.scope = {}

  return { token, auth: true }
}

export default resolver
