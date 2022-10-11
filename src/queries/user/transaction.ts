import { camelCase } from 'lodash'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLTransactionTypeResolver, TransactionTargetType } from 'definitions'

export const Transaction: GQLTransactionTypeResolver = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.Transaction, id }),
  fee: ({ fee }) => fee || 0,
  purpose: ({ purpose }) => camelCase(purpose),
  sender: (trx, _, { dataSources: { userService } }) =>
    trx.senderId ? userService.dataloader.load(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { userService } }) =>
    trx.recipientId ? userService.dataloader.load(trx.recipientId) : null,
  blockchainTx: (trx, _, { dataSources: { paymentService } }) => null,
  target: async (
    trx,
    _,
    { dataSources: { articleService, atomService, paymentService } }
  ) => {
    if (!trx.targetId || !trx.targetType) {
      return null
    }

    const tableTypeMap = {
      article: 'Article',
      circle_price: 'Circle',
      transaction: 'Transaction',
    }

    const { table } = (await atomService.findFirst({
      table: 'entity_type',
      where: { id: trx.targetType },
    })) as { table: keyof typeof tableTypeMap }

    let target
    switch (table) {
      case 'article': {
        target = await articleService.draftLoader.load(trx.targetId)
        break
      }
      case 'circle_price': {
        const price = await atomService.findUnique({
          table: 'circle_price',
          where: { id: trx.targetId },
        })
        target = await atomService.findUnique({
          table: 'circle',
          where: { id: price?.circleId },
        })
        break
      }
      case 'transaction': {
        target = await paymentService.dataloader.load(trx.targetId)
        break
      }
    }

    return {
      ...target,
      __type: tableTypeMap[table],
    }
  },
}

export const TransactionTarget = {
  __resolveType: ({ __type }: { __type: TransactionTargetType }) => __type,
}
