import {
  UserOSSToBoostResolver,
  UserOSSToRestrictionsResolver,
  UserOSSToScoreResolver,
} from 'definitions'

export const boost: UserOSSToBoostResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBoost(id)

export const score: UserOSSToScoreResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findScore(id)

export const restrictions: UserOSSToRestrictionsResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findRestrictions(id)
