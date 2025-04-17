import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
  ForbiddenError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['banCampaignArticles'] = async (
  _,
  { input: { campaign: campaignGlobalId, articles: articleGlobalIds } },
  { viewer, dataSources: { atomService } }
) => {
  // Authentication check
  if (!viewer.id) {
    throw new AuthenticationError('Visitor has no permission')
  }

  // Validate campaign
  const { type: campaignType, id: campaignId } = fromGlobalId(campaignGlobalId)

  if (campaignType !== 'Campaign' || !campaignId) {
    throw new UserInputError('invalid campaign id')
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new CampaignNotFoundError('Campaign not found')
  }

  // Authorization check - only system admin or campaign admin can remove articles
  if (!campaign.managerIds?.includes(viewer.id) && !viewer.hasRole('admin')) {
    throw new ForbiddenError('User is not a campaign admin')
  }

  // Validate articles
  const articleIds: string[] = []
  for (const articleGlobalId of articleGlobalIds) {
    const { type: articleType, id: articleId } = fromGlobalId(articleGlobalId)

    if (articleType !== 'Article' || !articleId) {
      throw new UserInputError('Invalid article id')
    }

    articleIds.push(articleId)
  }

  // Verify articles exist in campaign
  const campaignArticles = await atomService.findMany({
    table: 'campaign_article',
    where: { campaignId },
    whereIn: ['articleId', articleIds],
  })

  if (campaignArticles.length !== articleIds.length) {
    throw new UserInputError('Some articles are not in the campaign')
  }

  // Remove articles from campaign
  await atomService.updateMany({
    table: 'campaign_article',
    where: { campaignId },
    whereIn: ['articleId', articleIds],
    data: { enabled: false },
  })

  return campaign
}

export default resolver
