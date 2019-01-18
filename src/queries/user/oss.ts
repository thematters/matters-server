import { AuthenticationError } from 'apollo-server'
import {
  Context,
  UserToOssResolver,
  UserOSSToBoostResolver,
  UserOSSToScoreResolver
} from 'definitions'

export const rootOSS: UserToOssResolver = (
  root: any,
  _: any,
  { viewer }: Context
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  return root
}

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
