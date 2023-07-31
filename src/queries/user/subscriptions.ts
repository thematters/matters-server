import type { GQLUserResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLUserResolvers['subscriptions'] = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, draftService, userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, actions] = await Promise.all([
    userService.countSubscription(id),
    userService.findSubscriptions({ userId: id, skip, take }),
  ])
  const articles = (await articleService.dataloader.loadMany(
    actions.map(({ targetId }: { targetId: string }) => targetId)
  )) as any[]

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(articles.map(({ draftId }) => draftId)),
    input,
    totalCount
  )
}

export default resolver
