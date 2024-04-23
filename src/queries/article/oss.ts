import type { GQLArticleOssResolvers } from 'definitions'

export const boost: GQLArticleOssResolvers['boost'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const articleBoost = await atomService.findFirst({
    table: 'article_boost',
    where: { articleId },
  })

  if (!articleBoost) {
    return 1
  }

  return articleBoost.boost
}

export const score: GQLArticleOssResolvers['score'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const article = await atomService.findUnique({
    table: 'article_count_view',
    where: { id: articleId },
  })
  return article?.score || 0
}

export const inRecommendIcymi: GQLArticleOssResolvers['inRecommendIcymi'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const record = await atomService.findFirst({
      table: 'matters_choice',
      where: { articleId },
    })
    return !!record
  }

export const inRecommendHottest: GQLArticleOssResolvers['inRecommendHottest'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const setting = await atomService.findFirst({
      table: 'article_recommend_setting',
      where: { articleId },
    })

    if (!setting) {
      return true
    }

    return setting.inHottest
  }

export const inRecommendNewest: GQLArticleOssResolvers['inRecommendNewest'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const setting = await atomService.findFirst({
      table: 'article_recommend_setting',
      where: { articleId },
    })

    if (!setting) {
      return true
    }

    return setting.inNewest
  }
