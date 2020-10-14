import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToSubscribersResolver } from 'definitions'

const resolver: ArticleToSubscribersResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countSubscriptions(articleId)
  const actions = await articleService.findSubscriptions({
    id: articleId,
    offset,
    limit: first,
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
