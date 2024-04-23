import type { GQLTagResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLTagResolvers['articles'] = async (
  root,
  { input },
  { dataSources: { tagService, atomService } }
) => {
  const { selected, sortBy } = input
  const { take, skip } = fromConnectionArgs(input)

  const isFromRecommendation =
    ((root as any).numArticles || (root as any).numAuthors) > 0

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({
      id: root.id,
      selected,
      withSynonyms: isFromRecommendation,
    }),
    tagService.findArticleIds({
      id: root.id,
      selected,
      sortBy: sortBy as 'byHottestDesc' | 'byCreatedAtDesc' | undefined,
      withSynonyms: isFromRecommendation,
      skip,
      take,
    }),
  ])

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
