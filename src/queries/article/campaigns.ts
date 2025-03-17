import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['campaigns'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const campaignArticles = await atomService.findMany({
    table: 'campaign_article',
    where: { articleId: id },
    orderBy: [{ column: 'id', order: 'desc' }],
  })
  if (!campaignArticles) {
    return []
  }
  return Promise.all(
    campaignArticles.map(async ({ campaignId, campaignStageId }) => ({
      campaign: await atomService.campaignIdLoader.load(campaignId),
      stage: campaignStageId
        ? await atomService.campaignStageIdLoader.load(campaignStageId)
        : null,
    }))
  )
}

export default resolver
