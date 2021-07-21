import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { TagToArticlesResolver } from 'definitions'

const resolver: TagToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const { selected } = input
  const { take, skip } = fromConnectionArgs(input)

  const [totalCount, articleIds] = await Promise.all([
    tagService.countArticles({ id, selected }),
    tagService.findArticleIds({ id, skip, take, selected }),
  ])
  return connectionFromPromisedArray(
    articleService.draftLoader.loadMany(articleIds),
    input,
    totalCount
  )
}

export default resolver
