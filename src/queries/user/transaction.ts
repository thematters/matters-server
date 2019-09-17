import { camelCase } from 'lodash'

import { connectionFromPromisedArray, cursorToIndex, i18n } from 'common/utils'
import { GQLMATTypeResolver, GQLTransactionTypeResolver } from 'definitions'
import { TRANSACTION_PURPOSE } from 'common/enums'
import { ArticleNotFoundError } from 'common/errors'
import logger from 'common/logger'

const trans = {
  systemSubsidy: i18n({
    zh_hant: '系統補貼',
    zh_hans: '系统补贴',
    en: 'System subsidy'
  }),
  appreciateComment: i18n({
    zh_hant: '評論讚賞',
    zh_hans: '评论赞赏',
    en: 'Comment appreciation'
  }),
  invitationAccepted: i18n({
    zh_hant: '邀請獎勵',
    zh_hans: '邀请奖励',
    en: 'Invitation reward'
  }),
  joinByInvitation: i18n({
    zh_hant: '激活獎勵',
    zh_hans: '激活奖励',
    en: 'Activation reward'
  }),
  firstPost: i18n({
    zh_hant: '首發獎勵',
    zh_hans: '首发奖励',
    en: 'First post reward'
  })
}

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
  content: async (
    trx,
    _,
    { viewer, dataSources: { userService, articleService } }
  ): Promise<string> => {
    switch (trx.purpose) {
      case TRANSACTION_PURPOSE.appreciate:
        const article = await articleService.dataloader.load(trx.referenceId)
        if (!article) {
          throw new ArticleNotFoundError('reference article not found')
        }
        return article.title
      case TRANSACTION_PURPOSE.appreciateSubsidy:
      case TRANSACTION_PURPOSE.systemSubsidy:
        return trans['systemSubsidy'](viewer.language, {})
      case TRANSACTION_PURPOSE.appreciateComment:
        return trans['appreciateComment'](viewer.language, {})
      case TRANSACTION_PURPOSE.invitationAccepted:
        return trans['invitationAccepted'](viewer.language, {})
      case TRANSACTION_PURPOSE.joinByInvitation:
      case TRANSACTION_PURPOSE.joinByTask:
        return trans['joinByInvitation'](viewer.language, {})
      case TRANSACTION_PURPOSE.firstPost:
        return trans['firstPost'](viewer.language, {})
      default:
        logger.error(`transaction purpose ${trx.purpose} no match`)
        return ''
    }
  },
  sender: (trx, _, { dataSources: { userService } }) =>
    userService.baseFindById(trx.senderId),
  recipient: (trx, _, { dataSources: { userService } }) =>
    userService.baseFindById(trx.recipientId),
  target: (trx, _, { dataSources: { articleService } }) =>
    articleService.baseFindById(trx.referenceId),
  // TODO
  unit: (trx, _, { dataSources }) => 'mat'
}
