import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { RecommendationToFolloweeCommentsResolver } from 'definitions'

export const followeeComments: RecommendationToFolloweeCommentsResolver =
  async (
    { id }: { id: string },
    { input },
    { dataSources: { commentService, userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { take, skip } = fromConnectionArgs(input)

    const totalCount = await userService.countFolloweeComments(id)
    const items = await userService.followeeComments({ userId: id, skip, take })
    return connectionFromPromisedArray(
      commentService.dataloader.loadMany(items.map((item) => item.id)),
      input,
      totalCount
    )
  }
