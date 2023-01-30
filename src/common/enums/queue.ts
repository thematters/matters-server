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

  // refresh IPNS Feed
  refreshIPNSFeed: 'refreshIPNSFeed',

  // Notification
  sendMail: 'sendMail',

  // LikeCoin
  like: 'likeCoinLike',
  sendPV: 'likeCoinSendPV',
  getCivicLiker: 'getCivicLiker',

  // User
  archiveUser: 'userArchive',
  activateOnboardingUsers: 'activateOnboardingUsers',
  unbanUsers: 'unbanUsers',

  // Refresh Views
  refreshTagCountMaterialView: 'refreshTagCountMaterialView',
  refreshUserReaderView: 'refreshUserReaderView',
  refreshFeaturedCommentView: 'refreshFeaturedCommentView',
  refreshCurationTagMaterialView: 'refreshCurationTagMaterialView',
  refreshArticleHottestView: 'refreshArticleHottestView',
  refreshMostActiveAuthorView: 'refreshMostActiveAuthorView',
  refreshMostAppreciatedAuthorView: 'refreshMostAppreciatedAuthorView',
  refreshMostTrendyAuthorView: 'refreshMostTrendyAuthorView',
  refreshUserActivityView: 'refreshUserActivityView',
  refreshArticleReadTimeView: 'refreshArticleReadTimeView',
  refreshRecentlyReadTagsView: 'refreshRecentlyReadTagsView',
  refreshRecommendedArticlesFromReadTagsView:
    'refreshRecommendedArticlesFromReadTagsView',

  // Migration
  migration: 'migration',

  // Payment
  payout: 'payout',
  payTo: 'payTo',
  txTimeout: 'txTimeout',
  syncCurationEvents: 'syncCurationEvents',

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

  // ExchangeRate
  updateFiat: 'updateFiat',
  updateToken: 'updateToken',
}

export const QUEUE_NAME = {
  notification: 'notification',
  publication: 'publication',
  refreshViews: 'refreshViews',
  likecoin: 'likecoin',
  user: 'user',
  migration: 'migration',
  payout: 'payout',
  payTo: 'payTo',
  payToByBlockchain: 'payToByBlockchain',
  appreciation: 'appreciation',
  txTimeout: 'txTimeout',
  revision: 'revision',
  asset: 'asset',
  stripe: 'stripe',
  circle: 'circle',
  ipfs: 'ipfs',
  exchangeRate: 'exchangeRate',
}

export const QUEUE_CONCURRENCY = {
  publishArticle: 100,
  publishRevisedArticle: 100,
  refreshIPNSFeed: 2,
  migration: 2,
  payToByBlockchain: 25,
}

export const QUEUE_COMPLETED_LIST_SIZE = {
  none: true,
  small: 100,
  medium: 1000,
  large: 10000,
}
