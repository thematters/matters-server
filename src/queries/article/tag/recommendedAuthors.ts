import type { GQLTagResolvers } from 'definitions/index.js'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'

const resolver: GQLTagResolvers['recommendedAuthors'] = async (
  { id },
  { input },
  { dataSources: { tagService, atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  if (!id) {
    return connectionFromArray([], input)
  }

  const [totalCount, authorIds] = await Promise.all([
    tagService.countRelatedAuthors({ id }),
    tagService.findRelatedAuthors({
      id,
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(authorIds),
    input,
    totalCount
  )
}

export default resolver
