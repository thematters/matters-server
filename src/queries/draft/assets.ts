import { extractAssetDataFromHtml } from 'common/utils'
import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id, content },
  _,
  { dataSources: { systemService } }
) => {
  // gather assets from raw content
  const uuids = (extractAssetDataFromHtml(content) || []).filter(
    (uuid) => uuid && uuid !== 'embed'
  )
  return (await systemService.baseFindByUUIDs(uuids, 'asset')).map(
    (item: any) => {
      const { path } = item
      return {
        ...item,
        path: path ? `${systemService.aws.s3Endpoint}/${path}` : null,
      }
    }
  )
}

export default resolver
