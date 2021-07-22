import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { UserToCommentedArticlesResolver } from 'definitions'

const resolver: UserToCommentedArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService, draftService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const articles = await articleService.findByCommentedAuthor({
    id,
    take,
    skip,
  })

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input
  )
}

export default resolver
