import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFolloweeArticlesResolver } from 'definitions'

export const followeeArticles: RecommendationToFolloweeArticlesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, draftService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, articles] = await Promise.all([
    userService.countFolloweeArticles(id),
    userService.followeeArticles({ userId: id, offset, limit: first }),
  ])

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input,
    totalCount
  )
}
