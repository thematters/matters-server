import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToAppreciationsReceivedResolver } from 'definitions'

const resolver: ArticleToAppreciationsReceivedResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countAppreciations(id)

  return connectionFromPromisedArray(
    articleService.findAppreciations({
      referenceId: id,
      offset,
      limit: first,
    }),
    input,
    totalCount
  )
}

export default resolver
