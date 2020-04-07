import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { UserToSubscriptionsResolver } from 'definitions'

const resolver: UserToSubscriptionsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countSubscription(id)
  const actions = await userService.findSubscriptions({
    userId: id,
    offset,
    limit: first
  })

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(
      actions.map(({ targetId }: { targetId: string }) => targetId)
    ),
    input,
    totalCount
  )
}

export default resolver
