import { connectionFromPromisedArray } from 'common/utils'
import { UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const articles = await articleService.findByCommentedAuthor(id)
  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(
      articles.map((article) => article.id)
    ),
    input
  )
}

export default resolver
