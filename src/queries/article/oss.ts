import {
  ArticleOSSToBoostResolver,
  ArticleOSSToScoreResolver,
  ArticleOSSToInRecommendHottestResolver,
  ArticleOSSToInRecommendNewsetResolver,
  ArticleOSSToInRecommendTodayResolver,
  ArticleOSSToInRecommendIcymiResolver,
  ArticleOSSToInRecommendTopicResolver
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
) => !!(await articleService.findRecommendHottest(id))

export const inRecommendNewset: ArticleOSSToInRecommendNewsetResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!(await articleService.findRecommendNewset(id))

export const inRecommendTopic: ArticleOSSToInRecommendTopicResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!(await articleService.findRecommendTopic(id))
