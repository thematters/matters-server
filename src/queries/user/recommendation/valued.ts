import { ARTICLE_STATE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { RecommendationToValuedResolver } from 'definitions'

export const valued: RecommendationToValuedResolver = async (
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
  return connectionFromPromisedArray(
    articleService.recommendByScore({
      offset,
      limit: first,
      where,
      oss,
      score: 'value',
    }),
    input,
    totalCount
  )
}
