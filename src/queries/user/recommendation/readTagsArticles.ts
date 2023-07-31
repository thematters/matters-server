import type { GQLRecommendationResolvers, Draft } from 'definitions'

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

  const [totalCount, tagDrafts] = await Promise.all([
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
      tagDrafts.map(({ articleId }) => articleId)
    ) as Promise<Draft[]>,
    input,
    totalCount
  )
}

export default resolver
