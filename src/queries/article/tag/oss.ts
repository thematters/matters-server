import { TagOSSToBoostResolver, TagOSSToScoreResolver } from 'definitions'

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
