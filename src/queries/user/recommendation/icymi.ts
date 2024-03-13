import type { GQLRecommendationResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

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
