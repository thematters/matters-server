import { i18n } from 'common/utils/i18n'

export const UPLOAD_FILE_SIZE_LIMIT = 100 * 1024 * 1024

export const MATERIALIZED_VIEW = {
  articleCountMaterialized: 'article_count_materialized',
  tagCountMaterialized: 'tag_count_materialized',
  userReaderMaterialized: 'user_reader_materialized',
  articleActivityMaterialized: 'article_activity_materialized',
  featuredCommentMaterialized: 'featured_comment_materialized'
}

export const CACHE_TTL = {
  SHORT: 90,
  DEFAULT: 60,
  INSTANT: 0
}

export const USER_ROLE = {
  admin: 'admin',
  user: 'user',
  visitor: 'visitor'
}

export const SCOPE_MODE = {
  visitor: 'visitor',
  user: 'user',
  admin: 'admin',
  oauth: 'oauth'
}

export const SCOPE_TYPE = {
  read: 'read',
  write: 'write'
}

export const LANGUAGE = {
  zh_hans: 'zh_hans',
  zh_hant: 'zh_hant',
  en: 'en'
}

export const USER_ACTION = {
  appreciate: 'appreciate',
  follow: 'follow',
  block: 'block',
  subscribe: 'subscribe',
  rate: 'rate',
  upVote: 'up_vote',
  downVote: 'down_vote',
  finish: 'finish'
}

export const TRANSACTION_PURPOSE = {
  appreciate: 'appreciate',
  appreciateComment: 'appreciate-comment',
  appreciateSubsidy: 'appreciate-subsidy',
  invitationAccepted: 'invitation-accepted',
  joinByInvitation: 'join-by-invitation',
  joinByTask: 'join-by-task',
  firstPost: 'first-post',
  systemSubsidy: 'system-subsidy'
}

export const VOTE = {
  up: 'up',
  down: 'down'
}

export const COMMENT_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
  collapsed: 'collapsed'
}

export const USER_STATE = {
  inactive: 'inactive',
  onboarding: 'onboarding',
  active: 'active',
  banned: 'banned',
  frozen: 'frozen',
  archived: 'archived'
}

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned'
}

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published'
}

export const BCRYPT_ROUNDS = 12

export const BATCH_SIZE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'

export const APPRECIATION_REWARD = {
  invitationCalculate: 20,
  invitationAccepted: 5,
  joinByInvitation: 5,
  joinByTask: 10,
  firstPost: 10
}

export const ARTICLE_APPRECIATE_LIMIT = 5
export const ARTICLE_PIN_COMMENT_LIMIT = 3

export const VERIFICATION_CODE_EXIPRED_AFTER = 1000 * 60 * 5 // 5 mins
export const VERIFICATION_CODE_STATUS = {
  active: 'active',
  inactive: 'inactive',
  verified: 'verified',
  expired: 'expired',
  used: 'used'
}
export const VERIFICATION_CODE_TYPES = {
  register: 'register',
  email_reset: 'email_reset',
  email_reset_confirm: 'email_reset_confirm',
  password_reset: 'password_reset',
  email_verify: 'email_verify'
}

export const VERIFICATION_CODE_PROTECTED_TYPES = [
  'email_reset',
  'email_verify',
  'email_reset_confirm'
]

/**
 * Categories
 */
const __REPORT_CATEGORIES = [
  {
    id: 'report-1',
    name: i18n({
      zh_hant: '侵權、抄襲',
      zh_hans: '侵权、抄袭',
      en: 'Include infringed or plagiarized contents'
    })
  },
  {
    id: 'report-2',
    name: i18n({
      zh_hant: '攻擊、侮辱、誹謗、恐嚇他人',
      zh_hans: '攻击、侮辱、诽谤、恐吓他人',
      en: 'Include any abusive, insulting, threatening contents'
    })
  },
  {
    id: 'report-3',
    name: i18n({
      zh_hant: '鼓吹歧視、仇恨',
      zh_hans: '鼓吹歧视、仇恨',
      en: 'Include discriminating or hateful contents'
    })
  },
  {
    id: 'report-4',
    name: i18n({
      zh_hant: '誤導、欺詐、侵犯隱私',
      zh_hans: '误导、欺诈、侵犯隐私',
      en:
        "Include misleading, deceiving contents or violate others' legal rights"
    })
  },
  {
    id: 'report-5',
    name: i18n({
      zh_hant: '色情、暴力、教唆犯罪或鼓勵自我傷害',
      zh_hans: '色情、暴力、教唆犯罪或鼓励自我伤害',
      en: 'Include obscene, violent, tortuous inflammatory contents'
    })
  },
  {
    id: 'report-6',
    name: i18n({
      zh_hant: '假新聞、不實消息、垃圾訊息',
      zh_hans: '假新闻、不实消息、垃圾讯息',
      en: 'Include fake, inaccurate, trash contents'
    })
  },
  {
    id: 'report-7',
    name: i18n({
      zh_hant: '冒用他人身份',
      zh_hans: '冒用他人身份',
      en: 'Impersonate any person'
    })
  },
  {
    id: 'report-8',
    name: i18n({
      zh_hant: '其他（請填寫原因）',
      zh_hans: '其他（请填写原因）',
      en: 'Others (please specify)'
    })
  }
]

export const REPORT_CATEGORIES = {
  zh_hant: __REPORT_CATEGORIES.map(({ id, name }) => ({
    id,
    name: name('zh_hant', {})
  })),
  zh_hans: __REPORT_CATEGORIES.map(({ id, name }) => ({
    id,
    name: name('zh_hans', {})
  })),
  en: __REPORT_CATEGORIES.map(({ id, name }) => ({ id, name: name('en', {}) }))
}

const __FEEDBACK_CATEGORIES = [
  {
    id: 'feedback-1',
    name: i18n({
      zh_hant: '操作異常',
      zh_hans: '操作异常',
      en: 'Operation Exception'
    })
  },
  {
    id: 'feedback-2',
    name: i18n({
      zh_hant: '功能建議',
      zh_hans: '功能建议',
      en: 'Feature Suggestions'
    })
  },
  {
    id: 'feedback-3',
    name: i18n({
      zh_hant: '其他（請填寫原因）',
      zh_hans: '其他（请填写原因）',
      en: 'Others (please specify)'
    })
  }
]

export const FEEDBACK_CATEGORIES = {
  zh_hant: __FEEDBACK_CATEGORIES.map(({ id, name }) => ({
    id,
    name: name('zh_hant', {})
  })),
  zh_hans: __FEEDBACK_CATEGORIES.map(({ id, name }) => ({
    id,
    name: name('zh_hans', {})
  })),
  en: __FEEDBACK_CATEGORIES.map(({ id, name }) => ({
    id,
    name: name('en', {})
  }))
}

/**
 * Queue
 */
export const QUEUE_PRIORITY = {
  LOW: 20,
  NORMAL: 15,
  MEDIUM: 10,
  HIGH: 5,
  CRITICAL: 1
}

export const QUEUE_JOB = {
  // publication job
  publishArticle: 'publishArticle',
  // notification jobs
  sendMail: 'sendMail',
  pushNotification: 'pushNotification',
  // LikeCoin jobs
  like: 'likeCoinLike',
  sendPV: 'likeCoinSendPV',
  // User jobs
  archiveUser: 'userArchive',
  // repeat jobs
  publishPendingDrafts: 'publishPendingDrafts',
  sendDailySummaryEmail: 'sendDailySummaryEmail',
  activateOnboardingUsers: 'activateOnboardingUsers',
  // refresh views
  refreshArticleCountView: 'refreshArticleCountView',
  refreshTagCountMaterialView: 'refreshTagCountMaterialView',
  refreshUserReaderView: 'refreshUserReaderView',
  refreshArticleActivityView: 'refreshArticleActivityView',
  refreshFeaturedCommentView: 'refreshFeaturedCommentView',
  // migration
  migration: 'migration'
}

export const QUEUE_NAME = {
  notification: 'notification',
  publication: 'publication',
  schedule: 'schedule',
  likecoin: 'likecoin',
  user: 'user',
  migration: 'migration'
}

export const QUEUE_CONCURRENCY = {
  publishArticle: 100,
  migration: 5
}

export const QUEUE_COMPLETED_LIST_SIZE = {
  none: true,
  small: 100,
  medium: 1000,
  large: 10000
}

export const PUBLISH_ARTICLE_DELAY = 1000
export const MIGRATION_DELAY = 1000

export const EMAIL_TEMPLATE_ID = {
  verificationCode: {
    zh_hant: 'd-df196f90da7743f6900906fc18487953',
    zh_hans: 'd-f9373c61bdac43e1a24f221ceba4c61c',
    en: 'd-df196f90da7743f6900906fc18487953'
  },
  registerSuccess: {
    zh_hant: 'd-765b335a77d244438891a62f023b8c2e',
    zh_hans: 'd-30589f459aac4df1ab66e0f8af79fc4d',
    en: 'd-765b335a77d244438891a62f023b8c2e'
  },
  dailySummary: {
    zh_hant: 'd-4a5a938cdc0c4020a1e2feb67a553946',
    zh_hans: 'd-7f4276f1b32f48a4a51df90cbbb1447a',
    en: 'd-4a5a938cdc0c4020a1e2feb67a553946'
  },
  userDeleted: {
    zh_hant: 'd-231ada8640374adb9d79a0130480c801',
    zh_hans: 'd-cce84e261e0f4e47a2f1e2296b784230',
    en: 'd-231ada8640374adb9d79a0130480c801'
  },
  migrationSuccess: {
    zh_hant: '',
    zh_hans: '',
    en: ''
  }
}

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
  'matters管理员'
]

export const USER_ACCESS_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 90 // 90 days
export const OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 10 // 10 mins
export const OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
export const OAUTH_REFRESH_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 90 // 90 days

export const ACCEPTED_UPLOAD_IMAGE_TYPES: string[] = [
  'image/gif',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/svg+xml',
  'image/webp'
]

export const IMAGE_DIMENSION_LIMIT = 1400

export const LOG_RECORD_TYPES = {
  ReadFolloweeArticles: 'read_followee_articles',
  ReadResponseInfoPopUp: 'read_response_info_pop_up'
}

export const UTM_PARAMETER = {
  SOURCE: {
    IPFS: 'utm_source=ipfs'
  }
}

export const CORS_OPTIONS = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://matters.news',
    'https://www.matters.news',
    'https://oss.matters.news',
    'https://web-stage.matters.news',
    'https://oss-stage.matters.news',
    'https://web-likecoin.matters.news',
    'https://web-develop.matters.news',
    'https://oss-develop.matters.news',
    'https://matters.one',
    'https://www.matters.one'
  ],
  credentials: true
}

export const OAUTH_CALLBACK_ERROR_CODE = {
  userNotFound: 1,
  likerNotFound: 2,
  likerExists: 3
}

export const GQL_OPERATION = {
  query: 'query',
  mutation: 'mutation'
}

export const NODE_TYPES = {
  article: 'Article',
  comment: 'Comment',
  draft: 'Draft',
  user: 'User',
  tag: 'Tag'
}

export const CACHE_KEYWORD = '__cache__'

export const CACHE_PREFIX = 'cache-keys'

export const TRANSACTION_TYPES = {
  like: 'LIKE',
  mat: 'MAT'
}

export const SEARCH_KEY_TRUNCATE_LENGTH = 100

/**
 * Recommendation
 */

// this is the base64 representation of a vector of [0] * 20, the rank of our ALS model is 20
export const ALS_DEFAULT_VECTOR = {
  factor:
    '0|0 1|0 2|0 3|0 4|0 5|0 6|0 7|0 8|0 9|0 10|0 11|0 12|0 13|0 14|0 15|0 16|0 17|0 18|0 19|0',
  embedding:
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
}

export const OAUTH_PROVIDER = {
  facebbook: 'facebook',
  google: 'google',
  medium: 'medium'
}
