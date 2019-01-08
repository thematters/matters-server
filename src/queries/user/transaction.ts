import {
  GQLMATTypeResolver,
  Context,
  GQLTransactionTypeResolver
} from 'definitions'
import { TRANSACTION_PURPOSE } from 'common/enums'

export const MAT: GQLMATTypeResolver = {
  total: ({ id }, _, { dataSources: { userService } }: Context) =>
    userService.totalMAT(id),
  history: async (
    { id },
    { input },
    { dataSources: { userService } }: Context
  ) => {
    const history = await userService.transactionHistory({ id, ...input })

    return history
  }
}

export const Transaction: GQLTransactionTypeResolver = {
  delta: ({ delta }) => delta,
  purpose: ({ purpose }) => purpose,
  createdAt: ({ createdAt }) => createdAt,
  reference: async (
    trx,
    _,
    { dataSources: { userService, articleService } }: Context
  ) => {
    switch (trx.purpose) {
      case TRANSACTION_PURPOSE.appreciate:
        return articleService.dataloader.load(trx.referenceId).then(
          data => ({ ...data, __type: 'Article' }),
          err => {
            throw err
          }
        )
      case TRANSACTION_PURPOSE.invitationAccepted:
      case TRANSACTION_PURPOSE.joinByInvitation:
        const invitation = await userService.findInvitation(trx.reference_id)
        return { ...invitation, __type: 'Invitation' }
    }
  }
}
