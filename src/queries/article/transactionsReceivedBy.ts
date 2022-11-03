import { TRANSACTION_PURPOSE } from 'common/enums'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
} from 'common/utils'
import { ArticleToTransactionsReceivedByResolver, Item } from 'definitions'

const dashCase = (str: string) =>
  str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

const resolver: ArticleToTransactionsReceivedByResolver = async (
  { articleId },
  { input },
  { dataSources: { articleService, userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  let recipientDbId
  if (input.senderId) {
    const { id: dbId } = fromGlobalId(input.senderId)
    recipientDbId = dbId
  }

  const [totalCount, txs] = await Promise.all([
    articleService.countTransactions({
      purpose: dashCase(input.purpose) as TRANSACTION_PURPOSE,
      targetId: articleId,
      senderId: recipientDbId,
    }),
    articleService.findTransactions({
      skip,
      take,
      targetId: articleId,
      senderId: recipientDbId,
    }),
  ])

  return connectionFromPromisedArray(
    userService.dataloader.loadMany(txs.map(({ senderId }: Item) => senderId)),
    input,
    totalCount
  )
}

export default resolver
