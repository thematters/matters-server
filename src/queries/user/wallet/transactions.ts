import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { WalletToTransactionsResolver } from 'definitions'

const resolver: WalletToTransactionsResolver = async (
  { id },
  { input },
  { viewer, dataSources: { paymentService } }
) => {
  const { first, after, uuid, states } = input

  const offset = after ? cursorToIndex(after) + 1 : 0
  const totalCount = await paymentService.totalTransactionCount({
    userId: id,
    uuid,
    states: states as any,
  })

  return connectionFromPromisedArray(
    paymentService.findTransactions({
      userId: id,
      uuid,
      states: states as any,
      limit: first,
      offset,
    }),
    input,
    totalCount
  )
}

export default resolver
