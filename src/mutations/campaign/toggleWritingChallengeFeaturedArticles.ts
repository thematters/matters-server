import type { GQLMutationResolvers } from 'definitions'

import { NOTICE_TYPE } from 'common/enums'
import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

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

    // validate articles
    const articleIds: string[] = []

    for (const articleGlobalId of articleGlobalIds) {
      const { type: articleType, id: articleId } = fromGlobalId(articleGlobalId)

      if (articleType !== 'Article' || !articleId) {
        throw new UserInputError('invalid article id')
      }

      articleIds.push(articleId)
    }

    // update featured articles
    await atomService.updateMany({
      table: 'campaign_article',
      where: { campaignId },
      whereIn: ['articleId', articleIds],
      data: { featured: enabled },
    })

    for (const articleId of articleIds) {
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
