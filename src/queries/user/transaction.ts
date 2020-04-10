import { camelCase } from 'lodash'

import { GQLTransactionTypeResolver } from 'definitions'

export const Transaction: GQLTransactionTypeResolver = {
  purpose: ({ purpose }) => camelCase(purpose),
  sender: (trx, _, { dataSources: { userService } }) =>
    trx.senderId ? userService.dataloader.load(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { userService } }) =>
    trx.recipientId ? userService.dataloader.load(trx.recipientId) : null,
  target: (trx, _, { dataSources: { articleService } }) => {
    if (trx.targetId) {
      return articleService.dataloader.load(trx.targetId)
    } else {
      return null
    }
  },
}
