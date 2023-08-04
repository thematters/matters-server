import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLUserResolvers['subscriptions'] = async (
  { id },
  { input },
  { dataSources: { articleService, draftService, userService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, actions] = await Promise.all([
    userService.countSubscription(id),
    userService.findSubscriptions({ userId: id, skip, take }),
  ])
  const articles = (await articleService.loadByIds(
    actions.map(({ targetId }: { targetId: string }) => targetId)
  )) as any[]

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}

export default resolver
