import {
  type GQLArticleAccessType,
  type GQLArticleLicenseType,
  NotificationType,
  SkippedListItemType,
} from 'definitions'

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

export const GRAPHQL_COST_LIMIT = 5000
export const GRAPHQL_INPUT_LENGTH_LIMIT = 100

export const BCRYPT_ROUNDS = 12

export const DEFAULT_TAKE_PER_PAGE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'

export const APPRECIATION_PURPOSE = {
  appreciate: 'appreciate',
  superlike: 'superlike',
  appreciateComment: 'appreciate-comment',
  appreciateSubsidy: 'appreciate-subsidy',
  invitationAccepted: 'invitation-accepted',
  joinByInvitation: 'join-by-invitation',
  joinByTask: 'join-by-task',
  firstPost: 'first-post',
  systemSubsidy: 'system-subsidy',
}

export const VOTE = {
  up: 'up',
  down: 'down',
}

export const COMMENT_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  collapsed: 'collapsed',
}

export const COMMENT_TYPE = {
  article: 'article',
  circleDiscussion: 'circle_discussion',
  circleBroadcast: 'circle_broadcast',
}
export const COMMENT_TYPES_REVERSED = Object.fromEntries(
  Object.entries(COMMENT_TYPE).map(([k, v]) => [v, k])
)

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  pending: 'pending',
  error: 'error',
}

export const ARTICLE_ACCESS_TYPE: Record<string, GQLArticleAccessType> = {
  public: 'public',
  paywall: 'paywall',
}

export const ARTICLE_LICENSE_TYPE: Record<string, GQLArticleLicenseType> = {
  cc_0: "cc_0",
  cc_by_nc_nd_2: "cc_by_nc_nd_2",
  cc_by_nc_nd_4: "cc_by_nc_nd_4",
  arr: "arr",
}

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published',
}

export enum PIN_STATE {
  pinned = 'pinned',
  pinning = 'pinning',
  failed = 'failed',
}

export const CIRCLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
}

export const PRICE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
}

export const SUBSCRIPTION_STATE = {
  active: 'active',
  pastDue: 'past_due',
  unpaid: 'unpaid',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incompleteExpired: 'incomplete_expired',
  trialing: 'trialing',
}

export const APPRECIATION_REWARD = {
  invitationCalculate: 20,
  invitationAccepted: 5,
  joinByInvitation: 5,
  joinByTask: 10,
  firstPost: 10,
}

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
  Comment = 'Comment',
  Draft = 'Draft',
  User = 'User',
  Tag = 'Tag',
  Appreciation = 'Appreciation',
  Transaction = 'Transaction',
  Circle = 'Circle',
  Topic = 'Topic',
  Chapter = 'Chapter',
  Collection = 'Collection',

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

export const SEARCH_KEY_TRUNCATE_LENGTH = 100
export const SEARCH_ARTICLE_URL_REGEX =
  /^(https:\/\/([a-z0-9-]+.)?matters.(town|news)\/)@([a-zA-Z0-9_-]+)\/(.+?)-([0-9a-zA-Z]{49,59})$/gi

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
}

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

export const MAX_ARTICE_TITLE_LENGTH = 100
export const MAX_ARTICE_SUMMARY_LENGTH = 200
export const MAX_ARTICLE_CONTENT_LENGTH = 50e3
export const MAX_ARTICLES_PER_CONNECTION_LIMIT = 7
export const MAX_ARTICLE_CONTENT_REVISION_LENGTH = 50

export const MAX_TAGS_PER_ARTICLE_LIMIT = 3
export const TAGS_RECOMMENDED_LIMIT = 100

export const MAX_TAG_CONTENT_LENGTH = 50
export const MAX_TAG_DESCRIPTION_LENGTH = 200

export const MAX_PINNED_WORKS_LIMIT = 3
