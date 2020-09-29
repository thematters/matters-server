import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id },
  _,
  { dataSources: { systemService } }
) => {
  const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
    'draft'
  )
  const assetMap = await systemService.findAssetAndAssetMap(
    draftEntityTypeId,
    id
  )

  const assets = assetMap.map((asset) => {
    return {
      ...asset,
      path: asset.path ? `${systemService.aws.s3Endpoint}/${asset.path}` : null,
    }
  })

  return assets
}

export default resolver
