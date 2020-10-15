import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFolloweeArticlesResolver } from 'definitions'

export const followeeArticles: RecommendationToFolloweeArticlesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countFolloweeArticles(id)
  const articles = await userService.followeeArticles({
    userId: id,
    offset,
    limit: first,
  })
  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(
      articles.map((article) => article.id)
    ),
    input,
    totalCount
  )
}
