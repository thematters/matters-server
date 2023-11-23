import { GQLBadgeType, GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['badges'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (id === undefined) {
    return []
  }

  const badges = await atomService.findMany({
    table: 'user_badge',
    where: { userId: id },
  })

  return badges.map(({ type, extra }) => {
    switch (extra?.level) {
      case 1:
      case 2:
      case 3:
      case 4: // only allowed 4 values in extra?.level
        return { type: `${type}${extra?.level || ''}` as GQLBadgeType }
      default:
        return { type: type as GQLBadgeType }
    }
  })
}

export default resolver
