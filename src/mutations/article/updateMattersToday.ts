import { AssetNotFoundError, MattersTodayNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateMattersTodayResolver } from 'definitions'

const resolver: MutationToUpdateMattersTodayResolver = async (
  root,
  { input },
  { viewer, dataSources: { articleService, systemService } }
) => {
  const { id: dbId } = fromGlobalId(input.id)

  // Check matters today
  const today = await articleService.findRecommendToday(dbId)
  if (!today) {
    throw new MattersTodayNotFoundError('target matters today does not exists')
  }

  const updateParams: { [key: string]: any } = {}

  // Check cover asset
  if (input.cover) {
    const asset = await systemService.findAssetByUUID(input.cover)
    if (!asset || asset.type !== 'cover') {
      throw new AssetNotFoundError('avatar asset does not exists')
    }
    updateParams.cover = asset.id
  }

  await articleService.updateRecommendToday(dbId, updateParams)
  const updatedArticle = await articleService.dataloader.load(dbId)
  return updatedArticle
}

export default resolver
