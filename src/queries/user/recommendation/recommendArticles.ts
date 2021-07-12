import { ARTICLE_STATE } from 'common/enums'
import logger from 'common/logger'
import {
  connectionFromArray,
  cursorToIndex,
  loadManyFilterError,
} from 'common/utils'
import { RecommendationToRecommendArticlesResolver } from 'definitions'

export const recommendArticles: RecommendationToRecommendArticlesResolver =
  async (
    { id }: { id: string },
    { input },
    { dataSources: { userService, articleService, draftService } }
  ) => {
    const { first, after } = input
    const offset = cursorToIndex(after) + 1

    // fallback to icymi
    const fallback = async () => {
      const [totalCount, articles] = await Promise.all([
        articleService.countRecommendIcymi(),
        articleService.recommendIcymi({ offset, limit: first }),
      ])
      const nodes = await draftService.dataloader.loadMany(
        articles.map((article) => article.draftId)
      )
      return connectionFromArray(nodes, input, totalCount)
    }

    // fallback for visitors
    if (!id) {
      return fallback
    }

    // exclude last 10000 articles already read by this user
    const readHistory = await userService.findReadHistory({
      userId: id,
      limit: 10000,
    })
    const readHistoryIds = readHistory.map(({ article }) => article.id)

    try {
      const recommendedArtices = await userService.recommendItems({
        userId: id,
        itemIndex: 'article',
        first,
        offset,
        notIn: readHistoryIds,
      })

      const ids = recommendedArtices.map(({ id: aid }: { id: any }) => aid)

      // get nodes
      const [totalCount, nodes] = await Promise.all([
        articleService.baseCount({ state: ARTICLE_STATE.active }),
        articleService.draftLoader.loadMany(ids).then(loadManyFilterError),
      ])

      if (!nodes || nodes.length === 0) {
        return fallback
      }
      return connectionFromArray(nodes, input, totalCount)
    } catch (err) {
      logger.error(
        `error in recommendation to user via ES: ${JSON.stringify(err)}`
      )
      return fallback
    }
  }
