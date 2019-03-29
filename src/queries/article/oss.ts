import {
  ArticleOSSToBoostResolver,
  ArticleOSSToScoreResolver,
  ArticleOSSToInRecommendHottestResolver,
  ArticleOSSToInRecommendNewestResolver,
  ArticleOSSToInRecommendTodayResolver,
  ArticleOSSToInRecommendIcymiResolver,
  ArticleOSSToTodayCoverResolver
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

export const todayCover: ArticleOSSToTodayCoverResolver = async (
  { id },
  _,
  { dataSources: { articleService, systemService } }
) => {
  const { todayCover: cover } = await articleService.findRecommendToday(id)
  return cover ? systemService.findAssetUrl(cover) : null
}
