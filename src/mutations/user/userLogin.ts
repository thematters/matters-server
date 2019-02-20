import { setCookie } from 'common/utils'
import { MutationToUserLoginResolver } from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
  { input },
  { dataSources: { userService }, res }
) => {
  try {
    const { token, auth, expiresIn } = await userService.login({
      ...input,
      email: input.email ? input.email.toLowerCase() : null
    })

    setCookie({ res, token, expiresIn })

    return { token, auth }
  } catch (err) {
    throw err
  }
}

export default resolver
