import { fromGlobalId } from 'common/utils'
import { MutationToMergeTagsResolver } from 'definitions'

const resolver: MutationToMergeTagsResolver = async (
  root,
  { input: { ids, content } },
  { viewer, dataSources: { tagService } }
) => {
  const tagDdIds = ids.map(id => fromGlobalId(id).id)
  const newTag = await tagService.mergeTags({ tagIds: tagDdIds, content })
  return newTag
}

export default resolver
