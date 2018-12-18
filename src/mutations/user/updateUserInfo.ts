import { Resolver } from 'definitions'

const resolver: Resolver = async (_, { input }, { viewer, userService }) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  // TODO: check permission

  return await userService.baseUpdateById(viewer.id, input)
}

export default resolver
