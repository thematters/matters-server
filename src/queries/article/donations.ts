import type { GQLArticleResolvers, Item } from 'definitions'

import { NODE_TYPES, TRANSACTION_PURPOSE } from 'common/enums'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  toGlobalId,
} from 'common/utils'

const resolver: GQLArticleResolvers['donations'] = async (
  { id },
  { input },
  { dataSources: { articleService, atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, txs] = await Promise.all([
    articleService.countTransactions({
      purpose: TRANSACTION_PURPOSE.donation,
      targetId: id,
    }),
    articleService.findTransactions({
      skip,
      take,
      purpose: TRANSACTION_PURPOSE.donation,
      targetId: id,
    }),
  ])

  return connectionFromPromisedArray(
    txs.map((tx: Item) => ({
      id: toGlobalId({ type: NODE_TYPES.Transaction, id: tx.id }),
      sender: tx.senderId ? atomService.userIdLoader.load(tx.senderId) : null,
    })),
    input,
    totalCount
  )
}

export default resolver
