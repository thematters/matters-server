import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { WalletToTransactionsResolver } from 'definitions'

const resolver: WalletToTransactionsResolver = async (
  { id },
  { input },
  { viewer, dataSources: { userService } }
) => {
  const { first, after, uuid, states } = input

  const offset = after ? cursorToIndex(after) + 1 : 0
  const totalCount = await userService.totalTransactionCount({
    userId: id,
    uuid,
    states,
  })

  return connectionFromPromisedArray(
    userService.findTransactions({
      userId: id,
      uuid,
      states,
      limit: first,
      offset,
    }),
    input,
    totalCount
  )
}

export default resolver
