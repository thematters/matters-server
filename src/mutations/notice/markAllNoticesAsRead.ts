import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  await userService.markAllNoticesAsRead(viewer.id)

  return true
}

export default resolver
