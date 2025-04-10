import type { GQLCampaignOssResolvers } from '#definitions/index.js'

const resolver: GQLCampaignOssResolvers['managers'] = async (
  { managerIds },
  _,
  { dataSources: { atomService } }
) => {
  if (!managerIds) {
    return []
  }
  return atomService.userIdLoader.loadMany(managerIds)
}
export default resolver
