import { camelCase } from 'lodash'

import { APPRECIATION_PURPOSE } from 'common/enums'
import { ArticleNotFoundError } from 'common/errors'
import logger from 'common/logger'
import { i18n } from 'common/utils/i18n'
import { GQLAppreciationTypeResolver } from 'definitions'

const trans = {
  appreciateSubsidy: i18n({
    zh_hant: '平台補貼',
    zh_hans: '平台补贴',
    en: 'Appreciate subsidy',
  }),
  systemSubsidy: i18n({
    zh_hant: '種子獎勵',
    zh_hans: '种子奖励',
    en: 'System subsidy',
  }),
  appreciateComment: i18n({
    zh_hant: '評論讚賞',
    zh_hans: '评论赞赏',
    en: 'Comment appreciation',
  }),
  invitationAccepted: i18n({
    zh_hant: '邀請獎勵',
    zh_hans: '邀请奖励',
    en: 'Invitation reward',
  }),
  joinByInvitation: i18n({
    zh_hant: '激活獎勵',
    zh_hans: '激活奖励',
    en: 'Activation reward',
  }),
  firstPost: i18n({
    zh_hant: '首發獎勵',
    zh_hans: '首发奖励',
    en: 'First post reward',
  }),
}

export const Appreciation: GQLAppreciationTypeResolver = {
  purpose: ({ purpose }) => camelCase(purpose),
  content: async (trx, _, { viewer, dataSources: { articleService } }) => {
    switch (trx.purpose) {
      case APPRECIATION_PURPOSE.appreciate:
        const article = await articleService.dataloader.load(trx.referenceId)
        if (!article) {
          throw new ArticleNotFoundError('reference article not found')
        }
        return article.title
      case APPRECIATION_PURPOSE.appreciateSubsidy:
        return trans.appreciateSubsidy(viewer.language, {})
      case APPRECIATION_PURPOSE.systemSubsidy:
        return trans.systemSubsidy(viewer.language, {})
      case APPRECIATION_PURPOSE.appreciateComment:
        return trans.appreciateComment(viewer.language, {})
      case APPRECIATION_PURPOSE.invitationAccepted:
        return trans.invitationAccepted(viewer.language, {})
      case APPRECIATION_PURPOSE.joinByInvitation:
      case APPRECIATION_PURPOSE.joinByTask:
        return trans.joinByInvitation(viewer.language, {})
      case APPRECIATION_PURPOSE.firstPost:
        return trans.firstPost(viewer.language, {})
      default:
        logger.error(`appreciation purpose ${trx.purpose} no match`)
        return ''
    }
  },
  sender: (trx, _, { dataSources: { userService } }) =>
    trx.senderId ? userService.dataloader.load(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { userService } }) =>
    trx.recipientId ? userService.dataloader.load(trx.recipientId) : null,
  target: (trx, _, { dataSources: { articleService } }) => {
    if (trx.purpose === APPRECIATION_PURPOSE.appreciate && trx.referenceId) {
      return articleService.dataloader.load(trx.referenceId)
    } else {
      return null
    }
  },
}
