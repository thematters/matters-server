import type { GQLUserResolvers } from '#definitions/index.js'

const resolver: GQLUserResolvers['isMomentFeedMember'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return false
  }
  const record = await atomService.findFirst({
    table: 'moment_feed_user',
    where: { userId: id },
  })
  return record?.state === 'approved'
}

export default resolver
