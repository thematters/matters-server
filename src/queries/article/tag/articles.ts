import { TagToArticlesResolver } from 'definitions'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'

const resolver: TagToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await tagService.countArticles(id)
  const articleIds = await tagService.findArticleIds({
    id,
    offset,
    limit: first
  })
  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
