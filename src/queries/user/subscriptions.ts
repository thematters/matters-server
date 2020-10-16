import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { UserToSubscriptionsResolver } from 'definitions'

const resolver: UserToSubscriptionsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, draftService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, actions] = await Promise.all([
    userService.countSubscription(id),
    userService.findSubscriptions({
      userId: id,
      offset,
      limit: first,
    }),
  ])
  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
