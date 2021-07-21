import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { RecommendationToFollowingTagsArticlesResolver } from 'definitions'

export const followingTagsArticles: RecommendationToFollowingTagsArticlesResolver =
  async (
    { id }: { id: string },
    { input },
    { dataSources: { articleService, userService } }
  ) => {
    if (!id) {
      return connectionFromArray([], input)
    }

    const { take, skip } = fromConnectionArgs(input)

    const [totalCount, articleIds] = await Promise.all([
      userService.countFollowingTagsArticles(id),
      userService.findFollowingTagsArticles({ userId: id, skip, take }),
    ])

    return connectionFromPromisedArray(
      articleService.draftLoader.loadMany(
        articleIds.map(({ articleId }) => articleId)
      ),
      input,
      totalCount
    )
  }
