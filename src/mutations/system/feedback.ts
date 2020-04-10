import { AssetNotFoundError, UserInputError } from 'common/errors'
import { MutationToFeedbackResolver } from 'definitions'

const resolver: MutationToFeedbackResolver = async (
  root,
  { input: { category, description, contact, assetIds: assetUUIDs } },
  { viewer, dataSources: { systemService } }
) => {
  if (!viewer.id && !contact) {
    throw new UserInputError('"contact" is required with visitor')
  }

  let assetIds
  if (assetUUIDs) {
    const assets = await systemService.findAssetByUUIDs(assetUUIDs)
    if (!assets || assets.length <= 0) {
      assetIds = []
      // throw new AssetNotFoundError('Asset does not exists')
    }
    assetIds = assets.map((asset: any) => asset.id)
  }

  await systemService.feedback({
    userId: viewer.id,
    category,
    description,
    contact,
    assetIds,
  })

  return true
}

export default resolver
