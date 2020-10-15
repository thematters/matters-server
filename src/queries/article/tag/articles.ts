import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { TagToArticlesResolver } from 'definitions'

const resolver: TagToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { first, after, selected } = input
  const offset = cursorToIndex(after) + 1

  const totalCount = await tagService.countArticles({ id, selected })
  const articleIds = await tagService.findArticleIds({
    id,
    offset,
    limit: first,
    selected,
  })
  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
