import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { TagSearchResultToArticlesResolver } from 'definitions'

const resolver: TagSearchResultToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { selected, sortBy } = input
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({ id, selected, withSynonyms: true }),
    tagService.findArticleIds({
      id,
      skip,
      take,
      selected,
      sortBy: sortBy as 'byHottestDesc' | 'byCreatedAtDesc' | undefined,
      withSynonyms: true,
    }),
  ])

  console.log('tagSearchResultArticlesResolver:', {
    selected,
    sortBy,
  })

  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
