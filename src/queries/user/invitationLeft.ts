import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (viewer.id !== id) {
    throw Error('Not authorized')
  }
  const invitionCount = await userService.countInvitation(id)
  const mat = await userService.totalMAT(id)
  return Math.max(Math.floor(Math.log(mat)) - invitionCount, 0)
}

export default resolver
