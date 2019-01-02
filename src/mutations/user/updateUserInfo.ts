import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input },
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (input.avatar) {
    const avatarAssetUUID = input.avatar
    const asset = await systemService.findAssetByUUID(avatarAssetUUID)

    if (!asset || asset.type !== 'avatar' || asset.authorId !== viewer.id) {
      throw new Error('avatar asset does not exists') // TODO
    }

    input.avatar = asset.id
  }

  return await userService.update(viewer.id, input)
}

export default resolver
