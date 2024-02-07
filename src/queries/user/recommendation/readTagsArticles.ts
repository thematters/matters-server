import type { GQLRecommendationResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLRecommendationResolvers['readTagsArticles'] = async (
  { id: userId },
  { input },
  { dataSources: { atomService } }
) => {
  if (!userId) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, tagArticle] = await Promise.all([
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
    atomService.articleIdLoader.loadMany(tagArticle.map((d) => d.articleId)),
    input,
    totalCount
  )
}

export default resolver
