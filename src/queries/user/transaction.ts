import { connectionFromPromisedArray } from 'graphql-relay'

import { GQLMATTypeResolver, GQLTransactionTypeResolver } from 'definitions'
import { TRANSACTION_PURPOSE } from 'common/enums'

export const MAT: GQLMATTypeResolver = {
  total: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalMAT(id),
  history: async ({ id }, { input }, { dataSources: { userService } }) => {
    return connectionFromPromisedArray(
      userService.transactionHistory(id),
      input
    )
  }
}

export const Transaction: GQLTransactionTypeResolver = {
  delta: ({ delta }) => delta,
  purpose: ({ purpose }) => purpose,
  createdAt: ({ createdAt }) => createdAt,
  reference: async (
    trx,
    _,
    { dataSources: { userService, articleService } }
  ) => {
    switch (trx.purpose) {
      case TRANSACTION_PURPOSE.appreciate:
        const article = await articleService.dataloader.load(trx.referenceId)
        return { ...article, __type: 'Article' }
      case TRANSACTION_PURPOSE.invitationAccepted:
      case TRANSACTION_PURPOSE.joinByInvitation:
        const invitation = await userService.findInvitation(trx.referenceId)
        return { ...invitation, __type: 'Invitation' }
    }
  }
}
