import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { ArticleToTransactionsReceivedByResolver } from 'definitions'

const resolver: ArticleToTransactionsReceivedByResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, txs] = await Promise.all([
    articleService.countTransactions({ targetId: articleId }),
    articleService.findTransactions({
      skip,
      take,
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
