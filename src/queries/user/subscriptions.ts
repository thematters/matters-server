import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserResolvers['subscriptions'] = async (
  { id },
  { input },
  { dataSources: { atomService, userService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, actions] = await Promise.all([
    userService.countSubscription(id),
    userService.findSubscriptions({ userId: id, skip, take }),
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
