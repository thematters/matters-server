import { MutationToUserLoginResolver } from 'definitions'

const resolver: MutationToUserLoginResolver = async (
  root,
  { input },
  { dataSources: { userService }, res }
) => {
  try {
    const { token, auth } = await userService.login({
      ...input,
      email: input.email ? input.email.toLowerCase() : null
    })

    res.cookie('token', token, { maxAge: 86400, httpOnly: true })

    return { token, auth }
  } catch (err) {
    throw err
  }
}

export default resolver
