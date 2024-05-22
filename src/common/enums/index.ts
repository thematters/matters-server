import type { NotificationType, SkippedListItemType } from 'definitions'

import { DB_NOTICE_TYPE, OFFICIAL_NOTICE_EXTEND_TYPE } from './notification'

export * from './user'
export * from './action'
export * from './email'
export * from './language'
export * from './notification'
export * from './payment'
export * from './permission'
export * from './queue'
export * from './table'
export * from './upload'
export * from './time'
export * from './cookie'
export * from './cache'
export * from './verification'
export * from './file'
export * from './hardcode'
export * from './cors'
export * from './sqs'
export * from './logging'
export * from './collection'
export * from './feature'
export * from './auth'
export * from './oss'
export * from './tag'
export * from './search'
export * from './appreciation'
export * from './metrics'
export * from './badges'

export const GRAPHQL_COST_LIMIT = 25e3
export const GRAPHQL_INPUT_LENGTH_LIMIT = 100

export const BCRYPT_ROUNDS = 12

export const DEFAULT_TAKE_PER_PAGE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'

export const VOTE = {
  up: 'up',
  down: 'down',
} as const

export const COMMENT_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  collapsed: 'collapsed',
} as const

export const COMMENT_TYPE = {
  article: 'article',
  circleDiscussion: 'circle_discussion',
  circleBroadcast: 'circle_broadcast',
} as const

export const COMMENT_TYPES_REVERSED = Object.fromEntries(
  Object.entries(COMMENT_TYPE).map(([k, v]) => [v, k])
)

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  pending: 'pending',
  error: 'error',
} as const

export const ARTICLE_ACCESS_TYPE = {
  public: 'public',
  paywall: 'paywall',
} as const

export const ARTICLE_LICENSE_TYPE = {
  cc_0: 'cc_0',
  cc_by_nc_nd_2: 'cc_by_nc_nd_2',
  cc_by_nc_nd_4: 'cc_by_nc_nd_4',
  arr: 'arr',
} as const

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published',
} as const

export const CIRCLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
} as const

export const PRICE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
} as const

export const SUBSCRIPTION_STATE = {
  active: 'active',
  pastDue: 'past_due',
  unpaid: 'unpaid',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incompleteExpired: 'incomplete_expired',
  trialing: 'trialing',
} as const

export const APPRECIATION_REWARD = {
  invitationCalculate: 20,
  invitationAccepted: 5,
  joinByInvitation: 5,
  joinByTask: 10,
  firstPost: 10,
} as const

export const ARTICLE_APPRECIATE_LIMIT = 5
export const ARTICLE_PIN_COMMENT_LIMIT = 3

export const MIGRATION_DELAY = 1000

export const IMAGE_DIMENSION_LIMIT = 1400

export const LOG_RECORD_TYPES = {
  ReadFolloweeArticles: 'read_followee_articles',
  ReadFollowingFeed: 'read_following_feed',
  ReadResponseInfoPopUp: 'read_response_info_pop_up',
}

export const UTM_PARAMETER = {
  SOURCE: {
    IPFS: 'utm_source=ipfs',
  },
}

export const OAUTH_CALLBACK_ERROR_CODE = {
  userNotFound: 1,
  // likecoin
  likerNotFound: 2,
  likerExists: 3,
  // stripe
  stripeAccountNotFound: 4,
  stripeAuthFailed: 5,
  stripeAccountExists: 6,
  // https://stripe.com/docs/api/account_links/create#create_account_link-refresh_url
  stripeAccountRefresh: 7,
}

export enum NODE_TYPES {
  Article = 'Article',
  ArticleVersion = 'ArticleVersion',
  Comment = 'Comment',
  Draft = 'Draft',
  User = 'User',
  Tag = 'Tag',
  Appreciation = 'Appreciation',
  Transaction = 'Transaction',
  Circle = 'Circle',
  Collection = 'Collection',
  Report = 'Report',

  IcymiTopic = 'IcymiTopic',
  SkippedListItem = 'SkippedListItem',
  Price = 'Price',
  Invitation = 'Invitation',
  Announcement = 'Announcement',
  CryptoWallet = 'CryptoWallet',
  CryptoWalletNFTAsset = 'NFTAsset',

  // Unions & Interfaces
  Node = 'Node',
  Notice = 'Notice',
  Response = 'Response',
  TransactionTarget = 'TransactionTarget',
  PinnableWork = 'PinnableWork',
}

export const APPRECIATION_TYPES = {
  like: 'LIKE',
  mat: 'MAT',
}

export const OAUTH_PROVIDER = {
  facebbook: 'facebook',
  google: 'google',
}

export const MIGTATION_SOURCE = {
  medium: 'medium',
}

export const NOTIFICATION_TYPES: NotificationType[] = [
  ...Object.values(DB_NOTICE_TYPE),
  ...Object.values(OFFICIAL_NOTICE_EXTEND_TYPE),
]

export const SKIPPED_LIST_ITEM_TYPES: Record<string, SkippedListItemType> = {
  AGENT_HASH: 'agent_hash',
  EMAIL: 'email',
  DOMAIN: 'domain',
} as const

export const MATTERS_CHOICE_TOPIC_STATE = {
  published: 'published',
  editing: 'editing',
  archived: 'archived',
} as const

export const MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS = [3, 6]

export const LOCAL_STRIPE = {
  host: 'localhost',
  port: '12111',
  protocol: 'http',
}

export const MAX_ARTICLE_REVISION_COUNT = 4

export enum ActivityType {
  UserPublishArticleActivity = 'UserPublishArticleActivity',
  UserBroadcastCircleActivity = 'UserBroadcastCircleActivity',
  UserCreateCircleActivity = 'UserCreateCircleActivity',
  UserCollectArticleActivity = 'UserCollectArticleActivity',
  UserSubscribeCircleActivity = 'UserSubscribeCircleActivity',
  UserFollowUserActivity = 'UserFollowUserActivity',
  UserDonateArticleActivity = 'UserDonateArticleActivity',
  UserBookmarkArticleActivity = 'UserBookmarkArticleActivity',
  UserAddArticleTagActivity = 'UserAddArticleTagActivity',
}

export const MAX_ARTICLE_TITLE_LENGTH = 100
export const MAX_ARTICLE_SUMMARY_LENGTH = 200
export const MAX_ARTICLE_CONTENT_LENGTH = 50e3
export const MAX_ARTICLES_PER_CONNECTION_LIMIT = 3
export const MAX_ARTICLE_CONTENT_REVISION_LENGTH = 50

export const MAX_ARTICLE_COMMENT_LENGTH = 1200
export const MAX_COMMENT_EMPTY_PARAGRAPHS = 1

export const MAX_TAGS_PER_ARTICLE_LIMIT = 3
export const TAGS_RECOMMENDED_LIMIT = 100

export const MAX_TAG_CONTENT_LENGTH = 50
export const MAX_TAG_DESCRIPTION_LENGTH = 200

export const MAX_PINNED_WORKS_LIMIT = 3

export const LATEST_WORKS_NUM = 4
