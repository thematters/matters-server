import type {
  GQLAppreciationResolvers,
  GQLAppreciationPurpose,
} from 'definitions'

import { camelCase } from 'lodash'

import { APPRECIATION_PURPOSE } from 'common/enums'
import { ArticleNotFoundError } from 'common/errors'
import { getLogger } from 'common/logger'
import { i18n } from 'common/utils/i18n'

const logger = getLogger('query-appreciation')

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

export const Appreciation: GQLAppreciationResolvers = {
  purpose: ({ purpose }) => camelCase(purpose) as GQLAppreciationPurpose,
  content: async (
    trx,
    _,
    { viewer, dataSources: { atomService, articleService } }
  ) => {
    switch (trx.purpose) {
      case APPRECIATION_PURPOSE.appreciate:
      case APPRECIATION_PURPOSE.superlike: {
        const article = await atomService.articleIdLoader.load(
          trx.referenceId as string
        )
        if (!article) {
          throw new ArticleNotFoundError(
            'reference article linked draft not found'
          )
        }
        const node = await articleService.loadLatestArticleVersion(article.id)
        return node.title
      }
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
        if (trx.purpose != null) {
          // skip logging for null or undefined
          logger.error(`appreciation purpose ${trx.purpose} no match`)
        }
        return ''
    }
  },
  sender: (trx, _, { dataSources: { atomService } }) =>
    trx.senderId ? atomService.userIdLoader.load(trx.senderId) : null,
  recipient: (trx, _, { dataSources: { atomService } }) =>
    atomService.userIdLoader.load(trx.recipientId),
  target: (trx, _, { dataSources: { atomService } }) =>
    trx.purpose === APPRECIATION_PURPOSE.appreciate && trx.referenceId
      ? atomService.articleIdLoader.load(trx.referenceId)
      : null,
}
