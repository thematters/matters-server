import { ARTICLE_STATE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToHottestResolver } from 'definitions'

export const hottest: RecommendationToHottestResolver = async (
  { id },
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const { oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  const where = { 'article.state': ARTICLE_STATE.active } as {
    [key: string]: any
  }

  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await articleService.countRecommendHottest({
    where: id ? {} : where,
    oss,
  })

  /**
   * TODO: to update after finish A/B testing
   */
  if (viewer.group === 'b') {
    const groupBData = await articleService.recommendByScoreB({
      offset,
      limit: first,
      where,
      oss,
      score: 'activity',
    })
    return connectionFromPromisedArray(
      articleService.linkedDraftLoader.loadMany(
        groupBData.map((article) => article.id)
      ),
      input,
      totalCount
    )
  }

  const groupAData = await articleService.recommendByScore({
    offset,
    limit: first,
    where,
    oss,
    score: 'activity',
  })
  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(
      groupAData.map((article) => article.id)
    ),
    input,
    totalCount
  )
}
