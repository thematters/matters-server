import type { GQLArticleResolvers } from 'definitions'

import { USER_FEATURE_FLAG_TYPE, USER_STATE } from 'common/enums'

const resolver: GQLArticleResolvers['noindex'] = async (
  { id, spamScore, isSpam, authorId },
  _,
  { dataSources: { atomService, systemService } }
) => {
  // if article is spam
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
