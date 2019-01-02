import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { category, description, contact, assetIds: assetUUIDs } },
  { viewer, dataSources: { systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  let assetIds
  if (assetUUIDs) {
    const assets = await systemService.findAssetByUUIDs(assetUUIDs)
    if (!assets || assets.length <= 0) {
      throw new Error('Asset does not exists') // TODO
    }
    assetIds = assets.map(asset => asset.id)
  }

  await systemService.feedback(
    viewer.id,
    category,
    description,
    contact,
    assetIds
  )

  return true
}

export default resolver
