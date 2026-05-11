export const USER_RESTRICTION_TYPE = {
  articleHottest: 'articleHottest',
  articleNewest: 'articleNewest',
} as const

export const USER_FEATURE_FLAG_TYPE = {
  bypassSpamDetection: 'bypassSpamDetection',
  unlimitedArticleFetch: 'unlimitedArticleFetch',
  readSpamStatus: 'readSpamStatus',
  communityWatch: 'communityWatch',
} as const
