import {
  connectionFromPromisedArray,
  cursorToIndex,
  fromGlobalId,
} from 'common/utils'
import { WalletToTransactionsResolver } from 'definitions'

const resolver: WalletToTransactionsResolver = async (
  { id: userId },
  { input },
  { dataSources: { paymentService } }
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

  return connectionFromPromisedArray(
    paymentService.findTransactions({
      userId,
      id: txId,
      states: states as any,
      limit: first,
      offset,
    }),
    input,
    totalCount
  )
}

export default resolver
