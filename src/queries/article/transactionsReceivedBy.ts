import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToTransactionsReceivedByResolver } from 'definitions'

const resolver: ArticleToTransactionsReceivedByResolver = async (
  { id },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, result] = await Promise.all([
    articleService.countTransactions({ targetId: id }),
    articleService.findTransactions({ offset, limit: first, targetId: id }),
  ])

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(result.map(({ senderId }) => senderId)),
    input,
    totalCount
  )
}

export default resolver
