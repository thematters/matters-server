import type { GQLOSSResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const tags: GQLOSSResolvers['tags'] = async (
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
