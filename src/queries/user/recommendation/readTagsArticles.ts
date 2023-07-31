import type { GQLRecommendationResolvers } from 'definitions'

import _last from 'lodash/last'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLRecommendationResolvers['readTagsArticles'] = async (
  { id: userId },
  { input },
  { dataSources: { articleService, atomService } }
) => {
  if (!userId) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, tagArticles] = await Promise.all([
    atomService.count({
      table: 'recommended_articles_from_read_tags_materialized',
      where: { userId },
    }),
    atomService.findMany({
      table: 'recommended_articles_from_read_tags_materialized',
      where: { userId },
      take,
      skip,
    }),
  ])

  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(
      tagArticles.map(({ articleId }) => articleId)
    ),
    input,
    totalCount
  )
}

export default resolver
