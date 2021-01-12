export const QUEUE_PRIORITY = {
  LOW: 20,
  NORMAL: 15,
  MEDIUM: 10,
  HIGH: 5,
  CRITICAL: 1,
}

export const QUEUE_JOB = {
  // Publication
  publishArticle: 'publishArticle',
  publishPendingDrafts: 'publishPendingDrafts',

  // Notification
  sendMail: 'sendMail',
  pushNotification: 'pushNotification',

  // LikeCoin
  like: 'likeCoinLike',
  sendPV: 'likeCoinSendPV',

  // User
  archiveUser: 'userArchive',
  activateOnboardingUsers: 'activateOnboardingUsers',
  unbanUsers: 'unbanUsers',

  // Emails
  sendDailySummaryEmails: 'sendDailySummaryEmails',
  sendChurnEmails: 'sendChurnEmails',

  // Refresh Views
  refreshArticleCountView: 'refreshArticleCountView',
  refreshTagCountMaterialView: 'refreshTagCountMaterialView',
  refreshUserReaderView: 'refreshUserReaderView',
  refreshArticleActivityView: 'refreshArticleActivityView',
  refreshArticleValueView: 'refreshArticleValueView',
  refreshFeaturedCommentView: 'refreshFeaturedCommentView',
  refreshArticleInterestView: 'refreshArticleInterestView',
  refreshCurationTagMaterialView: 'refreshCurationTagMaterialView',

  /* Refresh Views - hottest articles A/B test*/
  refreshArticleHottestAView: 'refreshArticleHottestAView',
  refreshArticleHottestBView: 'refreshArticleHottestBView',

  refreshMostActiveAuthorView: 'refreshMostActiveAuthorView',
  refreshMostAppreciatedAuthorView: 'refreshMostAppreciatedAuthorView',
  refreshMostTrendyAuthorView: 'refreshMostTrendyAuthorView',

  // Migration
  migration: 'migration',

  // Payment
  payout: 'payout',
  payTo: 'payTo',
  txTimeout: 'txTimeout',

  // Appreciation
  appreciation: 'appreciation',

  // Revision
  publishRevisedArticle: 'publishRevisedArticle',
  publishPendingRevisionDrafts: 'publishPendingRevisionDrafts',

  // Asset
  deleteAsset: 'deleteAsset',
}

export const QUEUE_NAME = {
  notification: 'notification',
  publication: 'publication',
  emails: 'emails',
  refreshViews: 'refreshViews',
  likecoin: 'likecoin',
  user: 'user',
  migration: 'migration',
  payout: 'payout',
  payTo: 'payTo',
  appreciation: 'appreciation',
  txTimeout: 'txTimeout',
  revision: 'revision',
  asset: 'asset',
}

export const QUEUE_CONCURRENCY = {
  publishArticle: 100,
  publishRevisedArticle: 100,
  migration: 2,
}

export const QUEUE_COMPLETED_LIST_SIZE = {
  none: true,
  small: 100,
  medium: 1000,
  large: 10000,
}
