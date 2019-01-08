import { uniq } from 'lodash'
import { connectionFromPromisedArray } from 'graphql-relay'
import { Context, UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { commentService, articleService } }: Context
) => {
  const comments = await commentService.findByAuthor(id)
  const articleIds = uniq(
    comments.map(({ articleId }: { articleId: string }) => articleId)
  )
  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(articleIds),
    input
  )
}

export default resolver
