import { TagToArticlesResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: TagToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const articleIds = await tagService.findArticleIds(id)
  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(articleIds),
    input
  )
}

export default resolver
