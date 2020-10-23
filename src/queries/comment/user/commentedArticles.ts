import { connectionFromPromisedArray } from 'common/utils'
import { UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService, draftService } }
) => {
  const articles = await articleService.findByCommentedAuthor(id)
  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input
  )
}

export default resolver
