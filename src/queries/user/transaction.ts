import { camelCase } from 'lodash'

import { BLOCKCHAIN_CHAINID, NODE_TYPES, PAYMENT_PROVIDER } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLTransactionTypeResolver, TransactionTargetType } from 'definitions'

export const Transaction: GQLTransactionTypeResolver = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.Transaction, id }),
  fee: ({ fee }) => fee || 0,
  purpose: ({ purpose }) => camelCase(purpose),
  sender: (trx, _, { dataSources: { userService } }) =>
    trx.senderId ? userService.loadById(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { userService } }) =>
    trx.recipientId ? userService.loadById(trx.recipientId) : null,
  blockchainTx: async (trx, _, { dataSources: { paymentService } }) => {
    if (trx.provider === PAYMENT_PROVIDER.blockchain) {
      const blockchainTx = await paymentService.findBlockchainTransactionById(
        trx.providerTxId
      )
      const getChain = (chainId: string) => {
        for (const chain in BLOCKCHAIN_CHAINID) {
          // eslint-disable-next-line no-prototype-builtins
          if (BLOCKCHAIN_CHAINID.hasOwnProperty(chain)) {
            if (
              Object.values(
                BLOCKCHAIN_CHAINID[chain as keyof typeof BLOCKCHAIN_CHAINID]
              ).includes(chainId)
            ) {
              return chain
            }
          }
        }
      }
      return {
        chain: getChain(blockchainTx.chainId),
        txHash: blockchainTx.txHash,
      }
    }
    return null
  },
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
