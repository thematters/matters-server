import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFollowingTagsArticlesResolver } from 'definitions'

export const followingTagsArticles: RecommendationToFollowingTagsArticlesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const [totalCount, articleIds] = await Promise.all([
    userService.countFollowingTagsArticles(id),
    userService.findFollowingTagsArticles({ userId: id, offset, limit: first }),
  ])

  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(
      articleIds.map(({ articleId }) => articleId)
    ),
    input,
    totalCount
  )
}
