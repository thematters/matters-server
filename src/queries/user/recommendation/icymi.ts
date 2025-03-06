import type { GQLRecommendationResolvers } from 'definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from 'common/utils/index.js'

export const icymi: GQLRecommendationResolvers['icymi'] = async (
  _,
  { input },
  { dataSources: { recommendationService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const [articles, totalCount] = await recommendationService.findIcymiArticles({
    take,
    skip,
  })
  return connectionFromArray(articles, input, totalCount)
}
