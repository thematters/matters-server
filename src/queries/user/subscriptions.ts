import { connectionFromPromisedArray } from 'common/utils'

import { UserToSubscriptionsResolver } from 'definitions'

const resolver: UserToSubscriptionsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const actions = await userService.findSubscriptions(id)
  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input
  )
}

export default resolver
