import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { OSSToTagsResolver } from 'definitions'

export const tags: OSSToTagsResolver = async (
  root,
  { input },
  { viewer, dataSources: { tagService } }
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
