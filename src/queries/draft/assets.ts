import { extractAssetDataFromHtml } from 'common/utils'
import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id, content },
  _,
  { dataSources: { systemService } }
) => {
  // Gather data from asset_map
  const { id: entityTypeId } = await systemService.baseFindEntityTypeId('draft')
  let uuids = (await systemService.findAssetMap(entityTypeId, id)).map(
    (item: any) => item.uuid
  )
  // Use assets from raw content as fallback
  if (!uuids || (uuids && uuids.length === 0)) {
    uuids = extractAssetDataFromHtml(content)
  }
  return systemService.baseFindByUUIDs(uuids, 'asset')
}

export default resolver
