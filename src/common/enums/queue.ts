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
  verifyIPFSPinHashes: 'verifyIPFSPinHashes',
  republishMissingHashes: 'republishMissingHashes',

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

  // Refresh Views
  refreshArticleCountView: 'refreshArticleCountView',
  refreshTagCountMaterialView: 'refreshTagCountMaterialView',
  refreshUserReaderView: 'refreshUserReaderView',
  refreshArticleValueView: 'refreshArticleValueView',
  refreshFeaturedCommentView: 'refreshFeaturedCommentView',
  refreshArticleInterestView: 'refreshArticleInterestView',
  refreshCurationTagMaterialView: 'refreshCurationTagMaterialView',
  refreshArticleHottestView: 'refreshArticleHottestView',
  refreshMostActiveAuthorView: 'refreshMostActiveAuthorView',
  refreshMostAppreciatedAuthorView: 'refreshMostAppreciatedAuthorView',
  refreshMostTrendyAuthorView: 'refreshMostTrendyAuthorView',

  // Migration
  migration: 'migration',

  // Payment
  payout: 'payout',
  payTo: 'payTo',
  txTimeout: 'txTimeout',

  // Stripe
  syncDeliveryFailedEvents: 'syncDeliveryFailedEvents',

  // Appreciation
  appreciation: 'appreciation',

  // Revision
  publishRevisedArticle: 'publishRevisedArticle',
  publishPendingRevisionDrafts: 'publishPendingRevisionDrafts',

  // Asset
  deleteAsset: 'deleteAsset',

  // Circle
  transferTrialEndSubscriptions: 'transferTrialEndSubscriptions',
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
  stripe: 'stripe',
  circle: 'circle',
  ipfs: 'ipfs',
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
