import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToTransactionsReceivedByResolver } from 'definitions'

const resolver: ArticleToTransactionsReceivedByResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, txs] = await Promise.all([
    articleService.countTransactions({ targetId: articleId }),
    articleService.findTransactions({
      offset,
      limit: first,
      targetId: articleId,
    }),
  ])

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(txs.map(({ senderId }) => senderId)),
    input,
    totalCount
  )
}

export default resolver
