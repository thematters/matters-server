import { UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToMergeTagsResolver } from 'definitions'

const resolver: MutationToMergeTagsResolver = async (
  root,
  { input: { ids, content } },
  { viewer, dataSources: { tagService, userService } }
) => {
  // assign Matty as tag's editor
  const mattyUser = await userService.findByEmail('hi@matters.news')
  if (!mattyUser) {
    throw new UserNotFoundError('could not find Matty')
  }
  const tagDdIds = ids.map(id => fromGlobalId(id).id)
  const newTag = await tagService.mergeTags({
    tagIds: tagDdIds,
    content,
    editors: [mattyUser.id]
  })
  return newTag
}

export default resolver
