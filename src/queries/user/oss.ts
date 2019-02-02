import {
  Context,
  UserToOssResolver,
  UserOSSToBoostResolver,
  UserOSSToScoreResolver
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
