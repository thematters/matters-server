import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (viewer.id !== id) {
    throw Error('Not authorized')
  }
  const invited = await userService.findInvitations({ userId: id })
  const mat = await userService.totalMAT(id)
  return Math.max(Math.floor(Math.log(mat)) - invited.length, 0)
}

export default resolver
