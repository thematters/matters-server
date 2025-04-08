import type { GQLCampaignOssResolvers } from '#definitions/index.js'

const resolver: GQLCampaignOssResolvers['adminUsers'] = async (
  { adminUserIds },
  _,
  { dataSources: { atomService } }
) => {
  if (!adminUserIds) {
    return []
  }
  return atomService.userIdLoader.loadMany(adminUserIds)
}
export default resolver
