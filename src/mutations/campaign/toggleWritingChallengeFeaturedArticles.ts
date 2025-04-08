import type { GQLMutationResolvers } from '#definitions/index.js'

import { NOTICE_TYPE } from '#common/enums/index.js'
import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
  ForbiddenError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['toggleWritingChallengeFeaturedArticles'] =
  async (
    _,
    {
      input: {
        campaign: campaignGlobalId,
        articles: articleGlobalIds,
        enabled,
      },
    },
    { viewer, dataSources: { atomService, notificationService } }
  ) => {
    if (!viewer.id) {
      throw new AuthenticationError('visitor has no permission')
    }

    // validate campaign
    const { type: campaignType, id: campaignId } =
      fromGlobalId(campaignGlobalId)

    if (campaignType !== 'Campaign' || !campaignId) {
      throw new UserInputError('invalid campaign id')
    }

    const campaign = await atomService.findUnique({
      table: 'campaign',
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new CampaignNotFoundError('campaign not found')
    }

    if (
      !campaign.adminUserIds?.includes(viewer.id) &&
      !viewer.hasRole('admin')
    ) {
      throw new ForbiddenError('User is not a campaign admin')
    }

    // validate articles
    const articleIds: string[] = []

    for (const articleGlobalId of articleGlobalIds) {
      const { type: articleType, id: articleId } = fromGlobalId(articleGlobalId)

      if (articleType !== 'Article' || !articleId) {
        throw new UserInputError('invalid article id')
      }

      articleIds.push(articleId)
    }

    const campaignArticles = await atomService.findMany({
      table: 'campaign_article',
      where: { campaignId },
      whereIn: ['articleId', articleIds],
    })
    const updatedArticleIds = articleIds.filter(
      (articleId) =>
        !campaignArticles.some(
          (campaignArticle) =>
            campaignArticle.articleId === articleId &&
            campaignArticle.featured === enabled
        )
    )

    // update featured articles
    await atomService.updateMany({
      table: 'campaign_article',
      where: { campaignId },
      whereIn: ['articleId', updatedArticleIds],
      data: { featured: enabled },
    })

    // send notifications to new featured articles
    if (!enabled) {
      return campaign
    }

    for (const articleId of updatedArticleIds) {
      const article = await atomService.findUnique({
        table: 'article',
        where: { id: articleId },
      })
      notificationService.trigger({
        event: NOTICE_TYPE.campaign_article_featured,
        recipientId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'campaign', entity: campaign },
          { type: 'article', entityTable: 'article', entity: article },
        ],
      })
    }

    return campaign
  }

export default resolver
