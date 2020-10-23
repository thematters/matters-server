import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { TagToArticlesResolver } from 'definitions'

const resolver: TagToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { first, after, selected } = input
  const offset = cursorToIndex(after) + 1

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({ id, selected }),
    tagService.findArticleIds({ id, offset, limit: first, selected }),
  ])
  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
