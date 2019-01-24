import { ApolloError } from 'apollo-server'
import { camelCase, truncate } from 'lodash'

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
      userService.findTransactionHistory({ id, offset, limit: first }),
      input,
      totalCount
    )
  }
}

export const Transaction: GQLTransactionTypeResolver = {
  delta: ({ delta }) => delta,
  purpose: ({ purpose }) => camelCase(purpose),
  createdAt: ({ createdAt }) => createdAt,
  content: async (trx, _, { dataSources: { userService, articleService } }) => {
    switch (trx.purpose) {
      case TRANSACTION_PURPOSE.appreciate:
        const article = await articleService.dataloader.load(trx.referenceId)
        if (!article) {
          throw new ApolloError(
            'apprecated article cannot be found',
            'ARTICLE_NOT_FOUND'
          )
        }
        return article.title
      case TRANSACTION_PURPOSE.appreciateSubsidy:
        return '系統補貼' // TODO: i18n
      case TRANSACTION_PURPOSE.appreciateComment:
        return '評論' // TODO: i18n
      case TRANSACTION_PURPOSE.invitationAccepted:
        return '新用戶註冊激活' // TODO: i18n
      case TRANSACTION_PURPOSE.joinByInvitation:
        return '新用戶註冊激活' // TODO: i18n
      case TRANSACTION_PURPOSE.firstPost:
        return '新人首帖' // TODO: i18n
    }
  }
}
