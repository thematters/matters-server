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

  // refresh IPNS Feed
  refreshIPNSFeed: 'refreshIPNSFeed',

  // User
  unbanUsers: 'unbanUsers',

  // Migration
  migration: 'migration',

  // Payment
  payout: 'payout',
  payTo: 'payTo',
  syncCurationEvents: 'syncCurationEvents',

  // Revision
  publishRevisedArticle: 'publishRevisedArticle',

  // Asset
  deleteAsset: 'deleteAsset',

  // Notification
  sendNotification: 'sendNotification',
}

export const QUEUE_NAME = {
  publication: 'publication',
  user: 'user',
  migration: 'migration',
  payout: 'payout',
  payTo: 'payTo',
  payToByBlockchain: 'payToByBlockchain',
  revision: 'revision',
  asset: 'asset',
  notification: 'notification',
}

export const QUEUE_CONCURRENCY = {
  publishArticle: 100,
  publishRevisedArticle: 100,
  refreshIPNSFeed: 2,
  migration: 2,
  payToByBlockchain: 25,
  sendNotification: 100,
}

export const QUEUE_COMPLETED_LIST_SIZE = {
  none: true,
  small: 100,
  medium: 1000,
  large: 10000,
}

export const QUEUE_DELAY = {
  sendNotification: 10000, // 10 seconds
}
