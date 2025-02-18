import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserResolvers['bookmarkedArticles'] = async (
  { id },
  { input },
  { dataSources: { atomService, userService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, actions] = await Promise.all([
    userService.countBookmarkedArticles(id),
    userService.findBookmarkedArticles({ userId: id, skip, take }),
  ])

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
