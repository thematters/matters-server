import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  return await userService.update(viewer.id, input)
}

export default resolver
