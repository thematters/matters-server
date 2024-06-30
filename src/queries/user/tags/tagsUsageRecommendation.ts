import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  connectionFromArray,
} from 'common/utils'

const resolver: GQLUserResolvers['tags'] = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 10 })

  const [tags, totalCount] = await tagService.findByAuthorUsage({
    userId: id,
    skip,
    take,
  })

  return connectionFromPromisedArray(tags, input, totalCount)
}

export default resolver
