import { connectionFromPromisedArray } from 'common/utils'
import { UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  return connectionFromPromisedArray(
    articleService.findByCommentedAuthor(id),
    input
  )
}

export default resolver
