import { CacheScope } from 'apollo-cache-control'

import { CACHE_TTL } from 'common/enums'
import { connectionFromArray, cursorToIndex, fromGlobalId } from 'common/utils'
import { WalletToTransactionsResolver } from 'definitions'

const resolver: WalletToTransactionsResolver = async (
  { id: userId },
  { input },
  { dataSources: { paymentService } },
  { cacheControl }
) => {
  const { first, after, id, states } = input

  let txId
  if (id) {
    txId = fromGlobalId(id).id
  }

  const offset = after ? cursorToIndex(after) + 1 : 0
  const totalCount = await paymentService.totalTransactionCount({
    userId,
    id: txId,
    states: states as any,
  })

  // no-cache for single transaction query, used by client polling
  if (txId) {
    cacheControl.setCacheHint({
      maxAge: CACHE_TTL.INSTANT,
      scope: CacheScope.Private,
    })
  }

  const transactions = await paymentService.findTransactions({
    userId,
    id: txId,
    states: states as any,
    limit: first,
    offset,
  })

  return connectionFromArray(
    transactions.map((tx) => ({
      ...tx,
      amount: tx.delta,
    })),
    input,
    totalCount
  )
}

export default resolver
