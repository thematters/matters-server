import { camelCase } from 'lodash'

import { toGlobalId } from 'common/utils'
import { GQLTransactionTypeResolver, TransactionTargetType } from 'definitions'

export const Transaction: GQLTransactionTypeResolver = {
  id: ({ id }) => toGlobalId({ type: 'Transaction', id }),
  purpose: ({ purpose }) => camelCase(purpose),
  sender: (trx, _, { dataSources: { userService } }) =>
    trx.senderId ? userService.dataloader.load(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { userService } }) =>
    trx.recipientId ? userService.dataloader.load(trx.recipientId) : null,
  target: async (
    trx,
    _,
    { dataSources: { articleService, paymentService } }
  ) => {
    if (!trx.targetId || !trx.targetType) {
      return null
    }

    const tableTypeMap = {
      article: 'Article',
      transaction: 'Transaction',
    }

    const { table } = (await paymentService.baseFindEntityTypeTable(
      trx.targetType
    )) as { table: keyof typeof tableTypeMap }

    let target
    if (table === 'article') {
      target = await articleService.dataloader.load(trx.targetId)
    } else if (table === 'transaction') {
      target = await paymentService.dataloader.load(trx.targetId)
    }

    return {
      ...target,
      __type: tableTypeMap[table],
    }
  },
}

export const TransactionTarget = {
  __resolveType: ({ __type }: { __type: TransactionTargetType }) => {
    return __type
  },
}
