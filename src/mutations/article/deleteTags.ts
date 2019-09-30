import { fromGlobalId } from 'common/utils'
import { MutationToDeleteTagsResolver } from 'definitions'

const resolver: MutationToDeleteTagsResolver = async (
  root,
  { input: { ids } },
  { viewer, dataSources: { tagService } }
) => {
  const tagDdIds = ids.map(id => fromGlobalId(id).id)
  // const tags = await tagService.dataloader.loadMany(tagDdIds)

  await tagService.deleteTags(tagDdIds)

  return true
}

export default resolver
