import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
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

    const { first, after } = input
    const offset = cursorToIndex(after) + 1
    const [totalCount, articleIds] = await Promise.all([
      userService.countFollowingTagsArticles(id),
      userService.findFollowingTagsArticles({
        userId: id,
        offset,
        limit: first,
      }),
    ])

    return connectionFromPromisedArray(
      articleService.draftLoader.loadMany(
        articleIds.map(({ articleId }) => articleId)
      ),
      input,
      totalCount
    )
  }
