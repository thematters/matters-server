import { AuthenticationError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToFolloweeCommentsResolver } from 'definitions'

export const followeeComments: RecommendationToFolloweeCommentsResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { commentService, userService } }
) => {
  if (!id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.countFolloweeComments(id)
  const items = await userService.followeeComments({
    userId: id,
    offset,
    limit: first,
  })
  return connectionFromPromisedArray(
    commentService.dataloader.loadMany(items.map((item) => item.id)),
    input,
    totalCount
  )
}
