import type { GQLUserOssResolvers } from 'definitions'

export const boost: GQLUserOssResolvers['boost'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBoost(id)

export const score: GQLUserOssResolvers['score'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findScore(id)

export const restrictions: GQLUserOssResolvers['restrictions'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findRestrictions(id)
