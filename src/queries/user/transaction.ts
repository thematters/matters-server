import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'

import { GQLMATTypeResolver, GQLTransactionTypeResolver } from 'definitions'
import { TRANSACTION_PURPOSE } from 'common/enums'

export const MAT: GQLMATTypeResolver = {
  total: ({ id }, _, { dataSources: { userService } }) =>
    userService.totalMAT(id),
  history: async ({ id }, { input }, { dataSources: { userService } }) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const totalCount = await userService.countTransaction(id)

    return connectionFromPromisedArray(
      userService.transactionHistory({ id, offset, limit: first }),
      input,
      totalCount
    )
  }
}

export const Transaction: GQLTransactionTypeResolver = {
  delta: ({ delta }) => delta,
  purpose: ({ purpose }) => purpose,
  createdAt: ({ createdAt }) => createdAt,
  content: async (trx, _, { dataSources: { userService, articleService } }) => {
    switch (trx.purpose) {
      case TRANSACTION_PURPOSE.appreciate:
        const article = await articleService.dataloader.load(trx.referenceId)
        return article.title
      case TRANSACTION_PURPOSE.invitationAccepted:
        return '新用戶註冊激活' // TODO: i18n
      case TRANSACTION_PURPOSE.joinByInvitation:
        return '新用戶註冊激活' // TODO: i18n
    }
  }
}
