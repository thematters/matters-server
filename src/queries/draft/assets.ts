import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id, content },
  _,
  { dataSources: { systemService } }
) => {
  const assetIds = (await systemService.findAssetMapByEntityId(id)).map(
    (item: any) => item.assetId
  )
  return systemService.baseFindByIds(assetIds, 'asset')
}

export default resolver
