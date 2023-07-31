import {
  UserOSSToBoostResolver,
  UserOSSToRestrictionsResolver,
  UserOSSToScoreResolver,
} from 'definitions'

export const boost: GQLUserOSSResolvers['boost'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBoost(id)

export const score: GQLUserOSSResolvers['score'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findScore(id)

export const restrictions: GQLUserOSSResolvers['restrictions'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findRestrictions(id)
