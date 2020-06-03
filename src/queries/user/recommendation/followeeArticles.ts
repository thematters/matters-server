import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFolloweeArticlesResolver } from 'definitions'

export const followeeArticles: RecommendationToFolloweeArticlesResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countFolloweeArticles(id)
  return connectionFromPromisedArray(
    userService.followeeArticles({ userId: id, offset, limit: first }),
    input,
    totalCount
  )
}
