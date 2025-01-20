import type { GQLArticleResolvers } from 'definitions'

import { USER_FEATURE_FLAG_TYPE, USER_STATE } from 'common/enums'

const resolver: GQLArticleResolvers['noindex'] = async (
  { id, spamScore, isSpam, authorId },
  _,
  { dataSources: { atomService, systemService } }
) => {
  // if article is spam by admin
  if (isSpam) {
    return true
  }

  // if author is in spam whitelist
  const spamWhitelist = await atomService.findFirst({
    table: 'user_feature_flag',
    where: {
      userId: authorId,
      type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
    },
  })
  if (spamWhitelist) {
    return false
  }

  // if article is disabled in article_recommend_setting
  const articleRecommendSetting = await atomService.findFirst({
    table: 'article_recommend_setting',
    where: { articleId: id },
  })
  if (articleRecommendSetting) {
    return true
  }

  // if author is in user_restriction
  const userRestriction = await atomService.findFirst({
    table: 'user_restriction',
    where: { userId: authorId },
  })
  if (userRestriction) {
    return true
  }

  // if article is spam by system
  const spamThreshold = await systemService.getSpamThreshold()
  if (spamScore && spamThreshold && spamScore >= spamThreshold) {
    return true
  }

  // if author is archived
  const author = await atomService.findUnique({
    table: 'user',
    where: { id: authorId },
  })
  if (author?.state === USER_STATE.archived) {
    return true
  }

  return false
}

export default resolver
