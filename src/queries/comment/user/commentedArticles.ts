import { uniq } from 'lodash'
import { connectionFromPromisedArray } from 'common/utils'

import { UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id },
  { input },
  { dataSources: { commentService, articleService } }
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
