import { ALL_BADGE_TYPES } from '#common/enums/index.js'
import { GQLBadgeType, GQLUserInfoResolvers } from '#definitions/index.js'

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
    where: { userId: id, enabled: true },
  })

  return badges
    .map(({ type, extra }) => ({
      type: `${type}${extra?.level || ''}` as GQLBadgeType,
    }))
    .filter(({ type }) => ALL_BADGE_TYPES.includes(type))
}

export default resolver
