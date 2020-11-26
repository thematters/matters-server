import { CorsOptions } from 'cors'

import { isProd } from 'common/environment'
import { SkippedListItemType } from 'definitions'
import {
  DBNoticeType,
  NotificationType,
  OfficialNoticeExtendType,
} from 'definitions/notification'

export const MINUTE = 1000 * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const SERVER_TIMEOUT = 5 * MINUTE

export const GRAPHQL_COST_LIMIT = 500

export const UPLOAD_FILE_COUNT_LIMIT = 50

export const UPLOAD_FILE_SIZE_LIMIT = 100 * 1024 * 1024

export const UPLOAD_IMAGE_SIZE_LIMIT = 5 * 1024 * 1024

export const UPLOAD_AUDIO_SIZE_LIMIT = 100 * 1024 * 1024

export const UPLOAD_MIGRATION_SIZE_LIMIT = 1 * 1024 * 1024

export const VIEW = {
  articleValue: 'article_value_view',
  articleActivity: 'article_activity_view',

  /* Hottest articles A/B test */
  articleHottestA: 'article_hottest_a_view',
  articleHottestB: 'article_hottest_b_view',
}

export const MATERIALIZED_VIEW = {
  articleCountMaterialized: 'article_count_materialized',
  tagCountMaterialized: 'tag_count_materialized',
  userReaderMaterialized: 'user_reader_materialized',
  articleActivityMaterialized: 'article_activity_materialized',
  articleValueMaterialized: 'article_value_materialized',
  featuredCommentMaterialized: 'featured_comment_materialized',
  curationTagMaterialized: 'curation_tag_materialized',

  /* Hottest articles A/B test */
  articleHottestAMaterialized: 'article_hottest_a_materialized',
  articleHottestBMaterialized: 'article_hottest_b_materialized',

  mostActiveAuthorMaterialized: 'most_active_author_materialized',
  mostAppreciatedAuthorMaterialized: 'most_appreciated_author_materialized',
  mostTrendyAuthorMaterialized: 'most_trendy_author_materialized',
}

// cache TTL in seconds
export const CACHE_TTL = {
  PUBLIC_QUERY: 60 * 60 * 24, // 1 day
  PUBLIC_FEED_ARTICLE: 60 * 3, // 3 mins
  PUBLIC_FEED_TAG: 60 * 3, // 3 mins
  PUBLIC_FEED_USER: 60 * 30, // 30 mins
  PUBLIC_SEARCH: 60 * 60 * 1, // 1 hour

  PRIVATE_QUERY: 60 * 3, // 3 mins

  STATIC: 60 * 60 * 24 * 10, // 10 days for static data
  LONG: 60 * 60 * 24, // 1 day
  SHORT: 60 * 3, // 3 mins
  INSTANT: 0, // no cache
}

export const USER_ROLE = {
  admin: 'admin',
  user: 'user',
  visitor: 'visitor',
}

/**
 * auth mode is "oauth" if the viewer access token is signed via OAuth,
 * otherwise, it's `viewer.role`
 */
export const AUTH_MODE = {
  visitor: 'visitor',
  oauth: 'oauth',
  user: 'user',
  admin: 'admin',
}

/**
 * Scope grouping for mutation
 *
 * @see {@url https://github.com/thematters/developer-resource/wiki/Scopes#mutation}
 */
export const SCOPE_GROUP = {
  level1: 'level1',
  level2: 'level2',
  level3: 'level3',
}

export const SCOPE_PREFIX = {
  query: 'query:viewer',
  mutation: 'mutation',
}

export const LANGUAGE = {
  zh_hans: 'zh_hans',
  zh_hant: 'zh_hant',
  en: 'en',
}

export const USER_ACTION = {
  appreciate: 'appreciate',
  follow: 'follow',
  block: 'block',
  subscribe: 'subscribe',
  rate: 'rate',
  upVote: 'up_vote',
  downVote: 'down_vote',
  finish: 'finish',
}

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

export const USER_STATE = {
  frozen: 'frozen',
  onboarding: 'onboarding',
  active: 'active',
  banned: 'banned',
  archived: 'archived',
}

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
}

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published',
}

export const BCRYPT_ROUNDS = 12

export const BATCH_SIZE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'

export const APPRECIATION_REWARD = {
  invitationCalculate: 20,
  invitationAccepted: 5,
  joinByInvitation: 5,
  joinByTask: 10,
  firstPost: 10,
}

export const ARTICLE_APPRECIATE_LIMIT = 5
export const ARTICLE_PIN_COMMENT_LIMIT = 3

export const VERIFICATION_CODE_EXIPRED_AFTER = MINUTE * 5 // 5 mins
export const VERIFICATION_CODE_STATUS = {
  active: 'active',
  inactive: 'inactive',
  verified: 'verified',
  expired: 'expired',
  used: 'used',
}
export const VERIFICATION_CODE_TYPES = {
  register: 'register',
  email_reset: 'email_reset',
  email_reset_confirm: 'email_reset_confirm',
  password_reset: 'password_reset',
  payment_password_reset: 'payment_password_reset',
}

export const VERIFICATION_CODE_PROTECTED_TYPES = [
  'email_reset',
  'email_reset_confirm',
  'payment_password_reset',
]

/**
 * Queue
 */
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

export const MIGRATION_DELAY = 1000

const DEV_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-250ba94c759948cbb2bd9f94089d13b8',
    zh_hans: 'd-92b184faf2aa48fb8645600f2540cfb4',
    en: 'd-250ba94c759948cbb2bd9f94089d13b8',
  },
  registerSuccess: {
    zh_hant: 'd-06a6075fefe54a0f96157f69a726e46e',
    zh_hans: 'd-0be942cd60ff4082b35ab836b60a728f',
    en: 'd-06a6075fefe54a0f96157f69a726e46e',
  },
  dailySummary: {
    zh_hant: 'd-805ccf4182244f59a5388b581df1eeab',
    zh_hans: 'd-e242f3e39f014279966e43425b208cbe',
    en: 'd-805ccf4182244f59a5388b581df1eeab',
  },
  userDeleted: {
    zh_hant: 'd-b370a6eddc394814959b49db1ba4cfec',
    zh_hans: 'd-9774a8882f914afaa43e2634a234762b',
    en: 'd-b370a6eddc394814959b49db1ba4cfec',
  },
  migrationSuccess: {
    zh_hant: 'd-a86e6f1c1fc24379b4b21244f111161b',
    zh_hans: 'd-c0b89ae6e8fe4eed8f05277853561976',
    en: 'd-a86e6f1c1fc24379b4b21244f111161b',
  },
  churn: {
    zh_hant: 'd-f2df8dd4f3e24c7981ec152ccf6eb2ec',
    zh_hans: 'd-0e2daefb95214cf9ad0f9cd0d2957636',
    en: 'd-f2df8dd4f3e24c7981ec152ccf6eb2ec',
  },
  payment: {
    zh_hant: 'd-dd77980e9ec1477f98259c7e9fb4fc28',
    zh_hans: 'd-9fea53d8838e44c4be4b93d26b8f2e9a',
    en: 'd-dd77980e9ec1477f98259c7e9fb4fc28',
  },
  adoptTag: {
    zh_hant: 'd-88b64da37a3240a2b240b5fbdf944661',
    zh_hans: 'd-2d9dda465f294e1e8a7e226a4165d0d9',
    en: 'd-88b64da37a3240a2b240b5fbdf944661',
  },
  assignAsTagEditor: {
    zh_hant: 'd-ea7389447e9d48549a7d0ad86b90fa9f',
    zh_hans: 'd-6fe4334692e2475dba68a135831f0f40',
    en: 'd-ea7389447e9d48549a7d0ad86b90fa9f',
  },
}

const PROD_EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-df196f90da7743f6900906fc18487953',
    zh_hans: 'd-f9373c61bdac43e1a24f221ceba4c61c',
    en: 'd-df196f90da7743f6900906fc18487953',
  },
  registerSuccess: {
    zh_hant: 'd-765b335a77d244438891a62f023b8c2e',
    zh_hans: 'd-30589f459aac4df1ab66e0f8af79fc4d',
    en: 'd-765b335a77d244438891a62f023b8c2e',
  },
  dailySummary: {
    zh_hant: 'd-4a5a938cdc0c4020a1e2feb67a553946',
    zh_hans: 'd-7f4276f1b32f48a4a51df90cbbb1447a',
    en: 'd-4a5a938cdc0c4020a1e2feb67a553946',
  },
  userDeleted: {
    zh_hant: 'd-231ada8640374adb9d79a0130480c801',
    zh_hans: 'd-cce84e261e0f4e47a2f1e2296b784230',
    en: 'd-231ada8640374adb9d79a0130480c801',
  },
  migrationSuccess: {
    zh_hant: 'd-47b788ce3754426fb2a6d3c80b9872eb',
    zh_hans: 'd-2e7d84cd2965426b80eafcfdcd18776c',
    en: 'd-47b788ce3754426fb2a6d3c80b9872eb',
  },
  churn: {
    zh_hant: 'd-0b1612857f9b474aba91679c8e0994d8',
    zh_hans: 'd-d397d5ae9264436bb1e65a202174e6a9',
    en: 'd-0b1612857f9b474aba91679c8e0994d8',
  },
  payment: {
    zh_hant: 'd-96ab5281c6bd419ebec20e8dbcbed427',
    zh_hans: 'd-b00c4b181721405ebcb9170b1f890075',
    en: 'd-96ab5281c6bd419ebec20e8dbcbed427',
  },
  adoptTag: {
    zh_hant: 'd-20e5e339130d49d79fce853577f689d3',
    zh_hans: 'd-6e8f11d55f3447fc9e4ab2f4aa13ff2f',
    en: 'd-20e5e339130d49d79fce853577f689d3',
  },
  assignAsTagEditor: {
    zh_hant: 'd-3dc33b89e89442fe8c25c51502c9f4d6',
    zh_hans: 'd-fba153b334af44cb9c1ecc3695eff9fc',
    en: 'd-3dc33b89e89442fe8c25c51502c9f4d6',
  },
}

export const EMAIL_TEMPLATE_ID = isProd
  ? PROD_EMAIL_TEMPLATE_ID
  : DEV_EMAIL_TEMPLATE_ID

export const INVALID_NAMES = [
  'administrator',
  'administrators',
  'admin',
  'admins',
  'team',
  'teams',
  'matters',
  'member',
  'members',
  'user',
  'users',
  'matty',
  'matties',
  '團隊',
  '团队',
  '管理員',
  '管理员',
  'mattersadmin',
  'matters團隊',
  'matters团队',
  'matters管理員',
  'matters管理员',
]

export const COOKIE_TOKEN_NAME = '__token'
export const COOKIE_USER_GROUP = '__user_group'

export const USER_ACCESS_TOKEN_EXPIRES_IN_MS = DAY * 90 // 90 days
export const OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN_MS = MINUTE * 10 // 10 mins
export const OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS = DAY * 30 // 30 days
export const OAUTH_REFRESH_TOKEN_EXPIRES_IN_MS = DAY * 90 // 90 days

export const ASSET_TYPE = {
  avatar: 'avatar',
  cover: 'cover',
  embed: 'embed',
  embedaudio: 'embedaudio',
  profileCover: 'profileCover',
  oauthClientAvatar: 'oauthClientAvatar',
  tagCover: 'tagCover',
}

export const ACCEPTED_UPLOAD_IMAGE_TYPES: string[] = [
  'image/gif',
  'image/png',
  'image/jpeg',
  'image/webp',
]

export const ACCEPTED_UPLOAD_AUDIO_TYPES: string[] = ['audio/mpeg', 'audio/aac']

export const ACCEPTED_UPLOAD_MIGRATION_TYPES: string[] = ['text/html']

export const IMAGE_DIMENSION_LIMIT = 1400

export const LOG_RECORD_TYPES = {
  ReadFolloweeArticles: 'read_followee_articles',
  ReadResponseInfoPopUp: 'read_response_info_pop_up',
  SentNewRegisterChurnEmail: 'sent_new_register_churn_email',
  SentMediumTermChurnEmail: 'sent_medium_term_churn_email',
}

export const UTM_PARAMETER = {
  SOURCE: {
    IPFS: 'utm_source=ipfs',
  },
}

export const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, false)
    }

    const isLocalDev = /(localhost|127\.0\.0\.1):\d+$/.test(origin)
    const isMatters = /\/\/(.*\.)?matters\.news$/.test(origin)
    const isApolloStudio = /\/\/(.*\.)?apollographql\.com$/.test(origin)
    const isAllowed = isLocalDev || isMatters || isApolloStudio

    callback(null, isAllowed)
  },
  credentials: true,
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
}

export const NODE_TYPES = {
  article: 'Article',
  comment: 'Comment',
  draft: 'Draft',
  user: 'User',
  tag: 'Tag',
  appreciation: 'Appreciation',
  transaction: 'Transaction',

  // Unions & Interfaces
  node: 'Node',
  notice: 'Notice',
  response: 'Response',
  transactionTarget: 'TransactionTarget',
}

// keyword notating for cache invalidation
export const CACHE_KEYWORD = '__invalid_nodes__'

// redis cache for apq keys or resolver returned objects
export const CACHE_PREFIX = {
  OBJECTS: 'cache-objects',
  OPERATION_LOG: 'operation-log',
}

export const APPRECIATION_TYPES = {
  like: 'LIKE',
  mat: 'MAT',
}

export const SEARCH_KEY_TRUNCATE_LENGTH = 100
export const SEARCH_ARTICLE_URL_REGEX = /^(https:\/\/([a-z0-9-]+.)?matters.news\/)@([a-zA-Z0-9_-]+)\/(.+?)-([0-9a-zA-Z]{49,59})$/gi

/**
 * Recommendation
 */

// this is the base64 representation of a vector of [0] * 20, the rank of our ALS model is 20
export const ALS_DEFAULT_VECTOR = {
  factor:
    '0|0 1|0 2|0 3|0 4|0 5|0 6|0 7|0 8|0 9|0 10|0 11|0 12|0 13|0 14|0 15|0 16|0 17|0 18|0 19|0',
  embedding:
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
}

export const OAUTH_PROVIDER = {
  facebbook: 'facebook',
  google: 'google',
}

export const MIGTATION_SOURCE = {
  medium: 'medium',
}

/**
 * Notification
 */
export const DB_NOTICE_TYPES: DBNoticeType[] = [
  'user_new_follower',
  // article
  'article_published',
  'article_new_downstream',
  'article_new_collected',
  'article_new_appreciation',
  'article_new_subscriber',
  'article_new_comment',
  'article_mentioned_you',
  'subscribed_article_new_comment',
  'upstream_article_archived',
  'downstream_article_archived',
  'revised_article_published',
  'revised_article_not_published',
  // tag
  'article_tag_has_been_added',
  'article_tag_has_been_removed',
  'article_tag_has_been_unselected',
  'tag_adoption',
  'tag_leave',
  'tag_add_editor',
  'tag_leave_editor',
  // comment
  'comment_pinned',
  'comment_new_reply',
  'comment_mentioned_you',
  // payment
  'payment_received_donation',
  'payment_payout',
  // official
  'official_announcement',
]

export const OFFICIAL_NOTICE_EXTEND_TYPES: OfficialNoticeExtendType[] = [
  'user_activated',
  'user_banned',
  'user_frozen',
  'comment_banned',
  'article_banned',
  'article_reported',
  'comment_reported',
]

export const NOTIFICATION_TYPES: NotificationType[] = [
  ...DB_NOTICE_TYPES,
  ...OFFICIAL_NOTICE_EXTEND_TYPES,
]

export const SKIPPED_LIST_ITEM_TYPES: Record<string, SkippedListItemType> = {
  AGENT_HASH: 'agent_hash',
  EMAIL: 'email',
  DOMAIN: 'domain',
}

/**
 * Payment
 */
export enum TRANSACTION_STATE {
  pending = 'pending',
  succeeded = 'succeeded',
  failed = 'failed',
  canceled = 'canceled',
}

export enum TRANSACTION_PURPOSE {
  donation = 'donation',
  addCredit = 'add-credit',
  refund = 'refund',
  fee = 'fee',
  payout = 'payout',
}

export enum TRANSACTION_TARGET_TYPE {
  article = 'article',
  transaction = 'transaction',
}

export enum PAYMENT_CURRENCY {
  HKD = 'HKD',
  LIKE = 'LIKE',
}

export enum PAYMENT_PROVIDER {
  likecoin = 'likecoin',
  matters = 'matters',
  stripe = 'stripe',
}

export const PAYMENT_MAXIMUM_AMOUNT = {
  HKD: 5000,
}

export enum PAYMENT_PAYOUT_MINIMUM_AMOUNT {
  HKD = 500,
}

export enum PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE {
  express = 'express',
}

export enum SLACK_MESSAGE_STATE {
  canceled = 'canceled',
  failed = 'failed',
  successful = 'successful',
}

export enum TRANSACTION_REMARK {
  // LIKE
  TIME_OUT = 'time_out',

  // STRIPE
}

export const TransactionRemarkText = {
  [LANGUAGE.zh_hant]: {
    amount_too_large: '金額高於最大允許金額',
    amount_too_small: '金額低於最小允許金額',
    card_decline_rate_limit_exceeded: '銀行卡被拒絕多次，請等待24小時',
    card_declined: '銀行卡被拒絕',
    expired_card: '銀行卡已過期',
    incorrect_address: '銀行卡地址錯誤',
    incorrect_cvc: '安全碼錯誤',
    invalid_cvc: '無效安全碼',
    incomplete_cvc: '無效安全碼',
    incorrect_number: '卡號錯誤',
    incorrect_zip: '郵編錯誤',
    incomplete_zip: '郵編錯誤',
    invalid_expiry_month: '銀行卡有效期錯誤',
    invalid_expiry_month_past: '銀行卡有效期錯誤',
    invalid_expiry_year: '銀行卡有效期錯誤',
    invalid_expiry_year_past: '銀行卡有效期錯誤',
    incomplete_expiry: '銀行卡有效期錯誤',
    invalid_number: '無效卡號',
    incomplete_number: '無效卡號',
    postal_code_invalid: '無效郵政編碼',
    processing_error: '操作失敗',
    rate_limit: '操作過於頻繁',

    // likecoin
    unknown_likecoin_failue: 'Like pay支付失敗',

    // fallback
    unknow_error: '未知支付錯誤',
  },

  [LANGUAGE.zh_hans]: {
    amount_too_large: '金额高于最大允许金额',
    amount_too_small: '金额低于最小允许金额',
    card_decline_rate_limit_exceeded: '银行卡被拒绝多次，请等待24小时',
    card_declined: '银行卡被拒绝',
    expired_card: '银行卡已过期',
    incorrect_address: '银行卡地址错误',
    incorrect_cvc: '安全码错误',
    invalid_cvc: '无效安全码',
    incomplete_cvc: '无效安全码',
    incorrect_number: '卡号错误',
    incorrect_zip: '邮编错误',
    incomplete_zip: '邮编错误',
    invalid_expiry_month: '银行卡有效期错误',
    invalid_expiry_month_past: '银行卡有效期错误',
    invalid_expiry_year: '银行卡有效期错误',
    invalid_expiry_year_past: '银行卡有效期错误',
    incomplete_expiry: '银行卡有效期错误',
    invalid_number: '无效卡号',
    incomplete_number: '无效卡号',
    postal_code_invalid: '无效邮政编码',
    processing_error: '操作失败',
    rate_limit: '操作过于频繁',

    // likecoin
    unknown_likecoin_failue: 'Like pay支付失败',

    // fallback
    unknow_error: '未知支付错误',
  },
}

export const TAG_ACTION = {
  follow: 'follow',
}

export const AUTO_FOLLOW_TAGS = ['Matters新人打卡', '玩轉Matters實用指南']
