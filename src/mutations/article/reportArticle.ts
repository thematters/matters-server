import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id, category, description, assetIds: assetUUIDs } },
  { viewer, dataSources: { articleService, systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  let assetIds
  if (assetUUIDs) {
    const assets = await systemService.findAssetByUUIDs(assetUUIDs)
    if (!assets || assets.length <= 0) {
      throw new Error('Asset does not exists') // TODO
    }
    assetIds = assets.map(asset => asset.id)
  }

  await articleService.report(
    article.id,
    viewer.id,
    category,
    description,
    assetIds
  )

  return true
}

export default resolver
