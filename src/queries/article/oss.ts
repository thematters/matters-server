import {
  ArticleOSSToBoostResolver,
  ArticleOSSToInRecommendHottestResolver,
  ArticleOSSToInRecommendIcymiResolver,
  ArticleOSSToInRecommendNewestResolver,
  ArticleOSSToInRecommendTodayResolver,
  ArticleOSSToScoreResolver,
  ArticleOSSToTodayCoverResolver,
} from 'definitions'

export const boost: ArticleOSSToBoostResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.findBoost(id)

export const score: ArticleOSSToScoreResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.findScore(id)

export const inRecommendToday: ArticleOSSToInRecommendTodayResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!(await articleService.findRecommendToday(id))

export const inRecommendIcymi: ArticleOSSToInRecommendIcymiResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!(await articleService.findRecommendIcymi(id))

export const inRecommendHottest: ArticleOSSToInRecommendHottestResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const recommendSetting = await articleService.findRecommendSetting(id)
  return recommendSetting.inHottest
}

export const inRecommendNewest: ArticleOSSToInRecommendNewestResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const recommendSetting = await articleService.findRecommendSetting(id)
  return recommendSetting.inNewest
}
