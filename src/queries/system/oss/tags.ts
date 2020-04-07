import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToTagsResolver } from 'definitions'

export const tags: OSSToTagsResolver = async (
  root,
  { input },
  { viewer, dataSources: { tagService } }
) => {
  const { first, after, sort = 'newest' } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await tagService.baseCount()

  return connectionFromPromisedArray(
    tagService.find({
      sort,
      offset,
      limit: first
    }),
    input,
    totalCount
  )
}
