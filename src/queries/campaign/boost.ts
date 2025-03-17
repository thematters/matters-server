import type { GQLCampaignOssResolvers } from '#definitions/index.js'

const resolver: GQLCampaignOssResolvers['boost'] = async (
  { id: campaignId },
  _,
  { dataSources: { atomService } }
) => {
  const articleBoost = await atomService.findFirst({
    table: 'campaign_boost',
    where: { campaignId },
  })

  if (!articleBoost) {
    return 1
  }

  return articleBoost.boost
}
export default resolver
