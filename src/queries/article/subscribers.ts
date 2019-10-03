import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToSubscribersResolver } from 'definitions'

const resolver: ArticleToSubscribersResolver = async (
  { id },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countSubscriptions(id)
  const actions = await articleService.findSubscriptions({
    id,
    offset,
    limit: first
  })

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(
      actions.map(({ userId }: { userId: string }) => userId)
    ),
    input,
    totalCount
  )
}

export default resolver
