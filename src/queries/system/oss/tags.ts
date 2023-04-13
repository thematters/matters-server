import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { OSSToTagsResolver } from 'definitions'

export const tags: OSSToTagsResolver = async (
  _,
  { input },
  { dataSources: { tagService } }
) => {
  const { sort } = input
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await tagService.baseCount()

  return connectionFromPromisedArray(
    tagService.find({ sort, skip, take }),
    input,
    totalCount
  )
}
