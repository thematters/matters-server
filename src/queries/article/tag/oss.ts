import { AuthenticationError } from 'apollo-server'
import {
  Context,
  TagToOssResolver,
  TagOSSToBoostResolver,
  TagOSSToScoreResolver
} from 'definitions'

export const rootOSS: TagToOssResolver = (
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

export const boost: TagOSSToBoostResolver = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findBoost(id)

export const score: TagOSSToScoreResolver = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findScore(id)
