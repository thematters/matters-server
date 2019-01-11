import { MutationToUserRegisterResolver } from 'definitions'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { dataSources: { userService } }
) => {
  // TODO: check email
  // TODO: check username
  try {
    await userService.create(input)
    return userService.login(input)
  } catch (err) {
    throw err
  }
}

export default resolver
