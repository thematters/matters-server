import { setCookie, getViewerFromUser } from 'common/utils'
import { MutationToUserLoginResolver } from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
  { input },
  context
) => {
  const {
    dataSources: { userService },
    res
  } = context
  const { token, expiresIn, user } = await userService.login({
    ...input,
    email: input.email ? input.email.toLowerCase() : null
  })

  setCookie({ res, token, expiresIn })

  context.viewer = getViewerFromUser(user)

  return { token, auth: true }
}

export default resolver
