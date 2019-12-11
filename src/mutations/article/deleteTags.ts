import { fromGlobalId } from 'common/utils'
import { MutationToDeleteTagsResolver } from 'definitions'

const resolver: MutationToDeleteTagsResolver = async (
  root,
  { input: { ids } },
  { viewer, dataSources: { tagService } }
) => {
  const tagDbIds = ids.map(id => fromGlobalId(id).id)
  await tagService.deleteTags(tagDbIds)
  Promise.all(tagDbIds.map((id: string) => tagService.deleteSearch({ id })))
  return true
}

export default resolver
