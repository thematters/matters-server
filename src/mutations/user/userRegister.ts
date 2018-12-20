import { Resolver } from 'definitions'

const resolver: Resolver = (root, { input }, { userService }) => {
  // TODO: check email
  // TODO: check username
  return userService.create(input)
}

export default resolver
