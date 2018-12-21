import { Resolver } from 'definitions'

const resolver: Resolver = async (root, { input }, { userService }) => {
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
