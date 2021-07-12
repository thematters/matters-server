import {
  ArticleOSSToBoostResolver,
  ArticleOSSToInRecommendHottestResolver,
  ArticleOSSToInRecommendIcymiResolver,
  ArticleOSSToInRecommendNewestResolver,
  ArticleOSSToScoreResolver,
} from 'definitions'

export const boost: ArticleOSSToBoostResolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.findBoost(articleId)

export const score: ArticleOSSToScoreResolver = (
  { articleId },
  _,
  { dataSources: { articleService } }
) => articleService.findScore(articleId)

export const inRecommendIcymi: ArticleOSSToInRecommendIcymiResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => !!(await articleService.findRecommendIcymi(articleId))

export const inRecommendHottest: ArticleOSSToInRecommendHottestResolver =
  async ({ articleId }, _, { dataSources: { articleService } }) => {
    const recommendSetting = await articleService.findRecommendSetting(
      articleId
    )
    return recommendSetting.inHottest
  }

export const inRecommendNewest: ArticleOSSToInRecommendNewestResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const recommendSetting = await articleService.findRecommendSetting(articleId)
  return recommendSetting.inNewest
}
