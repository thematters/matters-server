import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToAppreciationsReceivedResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countAppreciations(articleId)

  return connectionFromPromisedArray(
    articleService.findAppreciations({
      referenceId: articleId,
      offset,
      limit: first,
    }),
    input,
    totalCount
  )
}

export default resolver
