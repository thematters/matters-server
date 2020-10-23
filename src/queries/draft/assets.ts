import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id },
  _,
  { dataSources: { systemService } }
) => {
  const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
    'draft'
  )
  const assets = await systemService.findAssetAndAssetMap({
    entityTypeId: draftEntityTypeId,
    entityId: id,
  })

  return assets.map((asset) => {
    return {
      ...asset,
      path: asset.path ? `${systemService.aws.s3Endpoint}/${asset.path}` : null,
    }
  })
}

export default resolver
