import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { TagToArticlesResolver } from 'definitions'

const resolver: TagToArticlesResolver = async (
  { id, numArticles, numAuthors },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { selected, sortBy } = input
  const { take, skip } = fromConnectionArgs(input)

  const isFromRecommendation = (numArticles || numAuthors) > 0

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({
      id,
      selected,
      withSynonyms: isFromRecommendation,
    }),
    tagService.findArticleIds({
      id,
      skip,
      take,
      selected,
      sortBy: sortBy as 'byHottestDesc' | 'byCreatedAtDesc' | undefined,
      withSynonyms: isFromRecommendation,
    }),
  ])

  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
