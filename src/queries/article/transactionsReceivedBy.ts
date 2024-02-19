import type { GQLArticleResolvers, Transaction } from 'definitions'

import { TRANSACTION_PURPOSE } from 'common/enums'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
} from 'common/utils'

const dashCase = (str: string) =>
  str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())

const resolver: GQLArticleResolvers['transactionsReceivedBy'] = async (
  { id: articleId },
  { input },
  { dataSources: { articleService, atomService } }
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
      excludeNullSender: true,
    }),
    articleService.findTransactions({
      purpose: dashCase(input.purpose) as TRANSACTION_PURPOSE,
      targetId: articleId,
      senderId: recipientDbId,
      skip,
      take,
      excludeNullSender: true,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(
      txs.map(({ senderId }: Transaction) => senderId)
    ),
    input,
    totalCount
  )
}

export default resolver
