import { ALL_BADGE_TYPES } from 'common/enums'
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

  return badges
    .map(({ type, extra }) => ({
      type: `${type}${extra?.level || ''}` as GQLBadgeType,
    }))
    .filter(({ type }) => ALL_BADGE_TYPES.includes(type))
}

export default resolver
