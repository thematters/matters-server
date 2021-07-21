import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { RecommendationToFolloweeArticlesResolver } from 'definitions'

export const followeeArticles: RecommendationToFolloweeArticlesResolver =
  async (
    { id }: { id: string },
    { input },
    { dataSources: { draftService, userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { take, skip } = fromConnectionArgs(input)

    const [totalCount, articles] = await Promise.all([
      userService.countFolloweeArticles(id),
      userService.followeeArticles({ userId: id, skip, take }),
    ])

    return connectionFromPromisedArray(
      draftService.dataloader.loadMany(
        articles.map((article) => article.draftId)
      ),
      input,
      totalCount
    )
  }
