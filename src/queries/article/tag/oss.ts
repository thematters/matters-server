import { GQLTagOssResolvers } from 'definitions/index.js'

export const boost: GQLTagOssResolvers['boost'] = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findBoost(id)

export const score: GQLTagOssResolvers['score'] = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findScore(id)
