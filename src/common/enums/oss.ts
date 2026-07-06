export const USER_RESTRICTION_TYPE = {
  articleHottest: 'articleHottest',
  articleNewest: 'articleNewest',
  // internal-only: set/removed by spam-ring detection, NOT part of the
  // GraphQL UserRestrictionType enum nor admin-editable via putRestrictedUsers
  spamRing: 'spamRing',
} as const

// the subset admins manage via putRestrictedUsers / OSS restricted-user list
export const ADMIN_USER_RESTRICTION_TYPES = [
  USER_RESTRICTION_TYPE.articleHottest,
  USER_RESTRICTION_TYPE.articleNewest,
]

export const USER_FEATURE_FLAG_TYPE = {
  bypassSpamDetection: 'bypassSpamDetection',
  unlimitedArticleFetch: 'unlimitedArticleFetch',
  readSpamStatus: 'readSpamStatus',
  communityWatch: 'communityWatch',
  fediverseBeta: 'fediverseBeta',
} as const
