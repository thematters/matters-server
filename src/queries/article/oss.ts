import { AuthenticationError } from 'apollo-server'
import {
  Context,
  ArticleToOssResolver,
  ArticleOSSToBoostResolver,
  ArticleOSSToScoreResolver,
  ArticleOSSToInRecommendHottestResolver,
  ArticleOSSToInRecommendNewsetResolver,
  ArticleOSSToInRecommendTodayResolver,
  ArticleOSSToInRecommendIcymiResolver
} from 'definitions'

export const rootOSS: ArticleToOssResolver = (
  root: any,
  _: any,
  { viewer }: Context
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  return root
}

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
) => !!articleService.findRecommendToday(id)

export const inRecommendIcymi: ArticleOSSToInRecommendIcymiResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!articleService.findRecommendIcymi(id)

export const inRecommendHottest: ArticleOSSToInRecommendHottestResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!articleService.findRecommendHottest(id)

export const inRecommendNewset: ArticleOSSToInRecommendNewsetResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => !!articleService.findRecommendNewset(id)
